import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createWriteStream, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Environnement des tests de parcours : une base PostgreSQL dédiée (`okoza_e2e`, recréée à chaque
 * lancement), les données de départ de l'API, puis l'API, son worker et le front sur des ports à part.
 * La base de développement n'est jamais touchée.
 */
const here = dirname(fileURLToPath(import.meta.url));
export const API_DIR = resolve(here, '../../../api');
export const FRONT_DIR = resolve(here, '../..');
export const LOG_DIR = join(FRONT_DIR, 'e2e', '.logs');

export const API_PORT = 3100;
export const WEB_PORT = 5174;
export const API_URL = `http://localhost:${API_PORT}`;
export const WEB_URL = `http://localhost:${WEB_PORT}`;
/** Mot de passe des comptes de démonstration dans la base de test uniquement */
export const DEMO_PASSWORD = 'parcours-e2e-OKOZA-2026';
const DB_NAME = 'okoza_e2e';

/** Adresse de la base de test, construite à partir de celle du développeur (mêmes hôte et identifiants). */
function testDatabaseUrl() {
  // En CI, pas de api/.env : le serveur PostgreSQL est donné par E2E_DATABASE_URL
  const fromEnv = process.env.E2E_DATABASE_URL;
  const line = fromEnv
    ? `DATABASE_URL=${fromEnv}`
    : readFileSync(join(API_DIR, '.env'), 'utf8')
        .split(/\r?\n/)
        .find((l) => l.startsWith('DATABASE_URL='));
  if (!line) throw new Error('api/.env : DATABASE_URL absente, impossible de dériver la base de test');
  const url = new URL(line.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, ''));
  const admin = new URL(url);
  admin.pathname = '/postgres';
  url.pathname = `/${DB_NAME}`;
  return { url: url.toString(), admin: admin.toString() };
}

/**
 * Variables de l'API pour les tests. Les valeurs vides neutralisent le .env du développeur (dotenv ne remplace
 * pas une variable déjà définie) : aucun e-mail réel (les e-mails sont écrits dans les logs), aucun envoi
 * d'image, aucune IA.
 */
function apiEnv(databaseUrl: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NODE_ENV: 'development',
    PORT: String(API_PORT),
    LOG_LEVEL: 'info',
    DATABASE_URL: databaseUrl,
    DIRECT_DATABASE_URL: databaseUrl,
    JWT_ACCESS_SECRET: randomBytes(48).toString('base64url'),
    APP_URL: WEB_URL,
    API_PUBLIC_URL: API_URL,
    CORS_ORIGINS: WEB_URL,
    SEED_DEMO_PASSWORD: DEMO_PASSWORD,
    RESEND_API_KEY: '',
    VAPID_PUBLIC_KEY: '',
    VAPID_PRIVATE_KEY: '',
    VAPID_SUBJECT: '',
    CLOUDINARY_CLOUD_NAME: '',
    CLOUDINARY_API_KEY: '',
    CLOUDINARY_API_SECRET: '',
    ANTHROPIC_API_KEY: '',
    GEMINI_API_KEY: '',
  };
}

/** Partie du client `pg` utilisée ici (le front n'a pas ses types) */
type PgClientClass = new (config: { connectionString: string }) => {
  connect(): Promise<void>;
  query(sql: string): Promise<unknown>;
  end(): Promise<void>;
};

async function recreateDatabase(adminUrl: string) {
  // pg est une dépendance de l'API : on la charge depuis son dossier
  const { Client } = createRequire(join(API_DIR, 'package.json'))('pg') as { Client: PgClientClass };
  const client = new Client({ connectionString: adminUrl });
  await client.connect();
  try {
    await client.query(`DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE)`);
    await client.query(`CREATE DATABASE ${DB_NAME}`);
  } finally {
    await client.end();
  }
}

function run(command: string, env: NodeJS.ProcessEnv, label: string) {
  const result = spawnSync(command, { cwd: API_DIR, env, shell: true, encoding: 'utf8' });
  if (result.status !== 0)
    throw new Error(`${label} a échoué (code ${result.status}) :\n${result.stdout}\n${result.stderr}`);
}

function start(command: string, cwd: string, env: NodeJS.ProcessEnv, logName: string) {
  const log = createWriteStream(join(LOG_DIR, logName));
  const child = spawn(command, { cwd, env, shell: true });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  return child;
}

async function waitFor(url: string, label: string, timeoutMs = 90_000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // Pas encore démarré
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${label} ne répond pas sur ${url} (voir e2e/.logs)`);
}

/** Arrête un processus lancé avec un shell, enfants compris (Windows ne les arrête pas avec le parent). */
export function stop(child: ChildProcess) {
  if (child.pid === undefined || child.exitCode !== null) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f']);
  else child.kill('SIGTERM');
}

export async function startStack() {
  rmSync(LOG_DIR, { recursive: true, force: true });
  mkdirSync(LOG_DIR, { recursive: true });
  const db = testDatabaseUrl();
  const env = apiEnv(db.url);

  await recreateDatabase(db.admin);
  run('npx prisma migrate deploy', env, 'Migrations');
  run('npx prisma db seed', env, 'Données de départ');

  // API et worker démarrent ensemble, comme lors d'un déploiement : la préparation de la file est verrouillée
  const children = [
    start('npx tsx src/server.ts', API_DIR, env, 'api.log'),
    start('npx tsx src/worker.ts', API_DIR, env, 'worker.log'),
  ];
  try {
    await waitFor(`${API_URL}/health`, 'API');
    children.push(
      start(
        // E2E_BUILD=1 (CI) : build de production servi tel quel, CSP comprise ; sinon serveur de développement
        process.env.E2E_BUILD === '1'
          ? `npx vite build && npx vite preview --port ${WEB_PORT} --strictPort`
          : `npx vite --port ${WEB_PORT} --strictPort`,
        FRONT_DIR,
        { ...process.env, VITE_BACKEND_URL: API_URL },
        'web.log',
      ),
    );
    await waitFor(WEB_URL, 'Front', 240_000);
  } catch (e) {
    children.forEach(stop);
    throw e;
  }
  return children;
}
