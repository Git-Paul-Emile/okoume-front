# Okoumé : boutique en ligne (front client)

Front-end client de la plateforme e-commerce pour le marché gabonais, conforme au cahier des charges (boutique à vendeur unique, prix en FCFA, paiement en espèces, Airtel Money ou Moov Money).

> **Nom et logo provisoires.** « Okoumé » et la feuille stylisée sont des espaces réservés. Pour les changer : `src/config/brand.ts`, `src/components/ui/Logo.tsx`, `public/favicon.svg`, `public/manifest.webmanifest` et le `<title>` de `index.html`.

## Stack

- React 19 + TypeScript (strict) + Vite 7
- Tailwind CSS 4 (design system dans `src/styles/globals.css`)
- Motion (animations), Lucide (icônes)
- TanStack Query (données serveur), Zustand (panier, session, interface), Zod (validation)
- React Router 7 (routes chargées à la demande)
- Vitest (tests)

## Démarrage

Prérequis : Node.js 20 ou plus récent, et l'API du dossier `api/` configurée (base PostgreSQL, voir `api/README.md`).

```bash
npm install
cp .env.example .env    # VITE_BACKEND_URL=http://localhost:3000
npm run dev
```

- Site : http://localhost:5173
- API Okoumé : http://localhost:3000

`npm run dev` lance l'API, son worker et le site ensemble. Toutes les données viennent de l'API : il n'y a plus de
serveur de démonstration ni de données fictives, et le site refuse de démarrer sans `VITE_BACKEND_URL`.

| Script              | Rôle                                                         |
| ------------------- | ------------------------------------------------------------ |
| `npm run dev`       | API, worker et site en développement                         |
| `npm run build`     | Vérification des types puis build de production dans `dist/` |
| `npm run test`      | Tests unitaires et tests de parcours (Vitest)                |
| `npm run lint`      | ESLint                                                       |
| `npm run typecheck` | Vérification TypeScript                                      |

## Données de démonstration

- **Compte client** : `demo@boutique.ga`, mot de passe `SEED_DEMO_PASSWORD` de l'API (niveau Argent, 340 points, une commande livrée)
- **Suivi sans compte** : commande `CMD-2026-00147`, code `K7P2QX`
- **Back-office** : `/admin`, compte `admin@boutique.ga` (administrateur principal), mot de passe `SEED_DEMO_PASSWORD` de l'API. Connexion, droits de chaque rôle et journal sont vérifiés par l'API.
  Autres comptes pour tester les rôles : `commandes@boutique.ga` (gestionnaire commandes) et `stock@boutique.ga` (gestionnaire stock), même mot de passe : chacun ne voit que les écrans de son rôle, les exports sont réservés à l'administrateur principal.
  Écrans : tableau de bord, statistiques et exports (avec motif), commandes (avancement, livreur, annulation), paiements Mobile Money à vérifier et remboursements, annulations et retours, livraisons et tarifs par quartier, produits (prix, coût d'achat, promotion, mise en ligne), catégories, stock (ajustements tracés par l'API), codes promo, clients, modération des avis, assistance, bannières et publicités, équipe et rôles, paramètres, répertoire des livreurs, inventaire physique (écarts puis validation explicite), import du catalogue en CSV (aperçu ligne par ligne, produits créés en brouillon), journal d'activité tenu par le serveur. Une commande Mobile Money ne peut pas entrer en préparation tant que son paiement n'est pas vérifié.
  Connexion en deux étapes : après le mot de passe, un code reçu par e-mail (ou un code de secours) est demandé ; mot de passe, code et blocage après plusieurs échecs sont vérifiés par l'API.
  Assistance : responsable par demande (prise en charge par le membre connecté), échéance de réponse selon la priorité (`settings.supportSla`, en heures), demandes en retard signalées, solution retenue obligatoire pour résoudre ou clôturer. Livraisons échouées : motif et décision (nouvelle tentative ou annulation) consignés. Remboursements : plafond par membre contrôlé par l'API. Articles et pages légales modifiables (Configuration) : la boutique affiche la version modifiée, sinon le texte modèle. Liens des réseaux sociaux dans les Paramètres.
  Exports en CSV, XLSX (classeur Excel généré dans le navigateur) et PDF (mis en page, chargé à la demande), toujours avec un motif, déclaré à l'API avant la génération du fichier et inscrit au journal.
  Assistant (Pilotage › Assistant) : résumé de la veille comparé au même jour de la semaine précédente (aussi en tête du tableau de bord), points d'attention avec leurs données justificatives, propositions à valider (retirer de l'accueil les produits en rupture, remise de 10 % sur le stock sans vente depuis 60 jours) qui s'appliquent après confirmation et peuvent être annulées, questions sur les ventes, la marge, le stock, les paiements, les quartiers et l'assistance. Les calculs sont faits sur les données ; le moteur est à règles, local et sans coût (`src/features/admin/adminAssistant.ts`), prêt à être remplacé par un modèle d'IA côté serveur. Les actions passent par l'API et peuvent être annulées.
- **Tableau de bord** : commandes, clients fictifs (`@exemple.ga`, sans connexion possible) et coût d'achat par variante (`cost`) chargés par les données de départ de l'API, pour calculer les marges. La « marge après livraison » n'est pas un bénéfice net.
- **Codes promo** : `BIENVENUE10` (1re commande), `LIVRAISON0` (livraison offerte dès 30 000 FCFA), `MAISON5000` (maison et cuisine), `ARGENT15` (membres Argent et Or)

Les **tenues traditionnelles** (pagne et wax, portées notamment le vendredi) sont rangées dans _Mode › Homme › Tenues traditionnelles_ et _Mode › Femme › Tenues traditionnelles_. La collection « Traditionnel » (`categorie=traditionnel`) regroupe les deux : elle s'affiche dans « Acheter par catégorie » mais pas dans les menus. Leurs photos viennent d'[Unsplash](https://unsplash.com/license) (usage commercial gratuit) et servent de démonstration : remplacez-les par les photos de vos propres articles.

Les photos produits viennent du CDN public de dummyjson.com (une connexion internet est nécessaire pour les afficher). Les prix, noms et descriptions ont été adaptés en français et en FCFA. Les avis sont des données fictives de démonstration : ils doivent être supprimés avant la mise en ligne.

Les numéros Mobile Money, WhatsApp et les coordonnées de la boutique sont fictifs : ils viennent des données de départ de l'API (`api/prisma/seeders/data/settings.json`).

## Espaces publicitaires

L'accueil comporte deux espaces publicitaires ouverts à **toute entreprise** (pas seulement aux produits de la boutique), chacun en diaporama de 3 visuels :

| Emplacement       | Où                                             | Format conseillé |
| ----------------- | ---------------------------------------------- | ---------------- |
| `home-promo`      | grande bannière sous « Intérieur » et « Sacs » | 1200 × 400 px    |
| `home-promo-side` | sous l'encart « Livraison offerte »            | 600 × 700 px     |

Sur mobile, les deux espaces utilisent le visuel `imageMobile` (800 × 600 px).

Ils se gèrent dans le back-office (Contenus) ; les visuels de départ viennent de l'API (`api/prisma/seeders/data/ads.json`) :

- Les entrées sans annonceur (`"advertiser": null`) sont les visuels « espace disponible » de la boutique ; ils renvoient vers le formulaire de contact, sujet « Publicité et partenariat ».
- Pour une campagne : dans Contenus, ajoutez les visuels (envoyés chez l'hébergeur d'images), l'annonceur, le texte du visuel, le site de l'annonceur, les dates, la priorité, puis activez-la.
- Chaque espace affiche 3 diapositives : d'abord les campagnes en cours, par priorité, puis les visuels « espace disponible » pour compléter. Une campagne porte la mention « Publicité · nom de l'annonceur » ; les liens externes s'ouvrent dans un nouvel onglet avec `rel="sponsored"`.

## Architecture

Découpage par fonctionnalité (norme `mon-app`) :

```text
src/
├── api/             client HTTP de l’API (backend.ts), ApiError, envoi des photos, types communs
├── components/
│   ├── feedback/    chargement, erreurs, états vides, notifications
│   ├── layout/      MainLayout, en-tête, navigation, pied de page
│   └── ui/          design system (Button, TextField, Drawer, Modal, Tabs, Reveal…)
├── config/          env.ts (validation Zod des variables), brand.ts
├── features/        un dossier par domaine métier
│   ├── articles/    conseils et guides
│   ├── assistant/   assistant d'achat (moteur local, remplaçable par une IA côté serveur)
│   ├── auth/        connexion, inscription, session
│   ├── cart/        panier, calcul des totaux, validation des prix et du stock
│   ├── categories/  arborescence, méga-menu
│   ├── checkout/    tunnel en 3 étapes, idempotence, instructions de paiement
│   ├── delivery/    zones et tarifs par quartier
│   ├── favorites/
│   ├── health/      bandeau de fonctionnement dégradé (ApiStatus)
│   ├── home/        sections de l'accueil
│   ├── loyalty/     points, niveaux, parrainage
│   ├── orders/      statuts, suivi, annulation, retours
│   ├── products/    fiche, galerie, variantes, filtres du catalogue
│   ├── promotions/  codes promo
│   ├── reviews/     avis et notes
│   ├── search/      recherche tolérante (accents, fautes de frappe)
│   ├── settings/    paramètres de la boutique
│   └── support/     demandes d'assistance
├── hooks/  lib/  pages/  router/  stores/  styles/  test/  utils/
```

Chaque fonctionnalité suit le même schéma : `*.backend.ts` (appels à l'API, réponses validées par zod) et `*.api.ts` (façade utilisée par l'interface) → `*.queries.ts` (hooks TanStack Query) → `components/`.

## Règles métier implémentées

- Commande **sans compte obligatoire** ; suivi par numéro + code temporaire.
- Panier conservé localement, **sans réservation de stock** à l'ajout.
- Si un prix change alors que le produit est dans le panier, l'ancien et le nouveau prix sont affichés et le client doit accepter le nouveau montant.
- Ordre des réductions : **promotion produit → code promo → points**. Pas de cumul promotion produit + code sur un même article. Cumul plafonné (`maxDiscountRate`, 50 % par défaut). Les points ne paient jamais la livraison.
- Fidélité : 1 point / 1 000 FCFA (hors livraison), 1 point = 50 FCFA, minimum 100 points, crédités après livraison et paiement. Points retirés au remboursement (au prorata pour un retour partiel) ; un solde négatif bloque leur utilisation. Corrections manuelles avec motif, historique jamais modifié. Récompense de parrainage suspecte (même téléphone, même adresse, parrainages en rafale, très petite commande) mise en attente de validation.
- Livraison : **tarif fixe par quartier**, affiché avant la confirmation ; quartier non desservi enregistré « sur confirmation ». Un client peut demander son quartier s'il n'est pas dans la liste ; l'équipe ajoute la zone (frais client et coût habituel d'une course) ou refuse avec un motif.
- Codes promo : produits et catégories éligibles, niveaux de fidélité, première commande, nombre d'utilisations au total et par client.
- Confirmation protégée contre les doubles clics : **clé d'idempotence** conservée pendant la tentative ; stock, réservation, prix, code et points vérifiés par l'API dans une seule transaction.
- Mobile Money : instructions (numéro, bénéficiaire, montant, référence = n° de commande), vérification manuelle, aucune preuve à téléverser.
- Annulation directe avant préparation (libère la réservation) ; ensuite, demande examinée par la boutique. Retours avec motifs et quantités.
- Produit indisponible : consultable mais non commandable.
- Assistant d'achat : n'utilise que les données du catalogue, respecte le budget indiqué, ne modifie jamais le panier, oriente vers un humain.
- Cookies : bannière de consentement (« Tout refuser » aussi visible que « Tout accepter »), choix redemandé après 6 mois, lien « Gérer les cookies » dans le pied de page. La mesure d'audience ne doit démarrer que si `canMeasureAudience()` le permet.
- Avis : réservés aux clients qui ont reçu le produit, un seul par produit (modifiable, il repasse en modération), jusqu'à 3 photos ; signalement avec motif.
- Commande : délai de paiement Mobile Money affiché (paramètre `mobileMoneyExpiryHours`), changement de moyen de paiement immédiat tant que rien n'est encaissé, contestation d'une livraison (réclamation prioritaire, le statut « Livrée » reste affiché), réouverture d'un retour refusé, facture imprimable en PDF (`/facture/:numero`, mentions NIF/RCCM à compléter dans `settings.legal`).
- Assistance : photos jointes (3 au maximum, compte connecté), réouverture d’une demande pendant `reopenWindowDays` jours.
- Compte : cadeau d'anniversaire au choix (points ou code), notifications par type de message et par canal.
- Données personnelles (19.5) : depuis le profil, téléchargement immédiat des données, demandes d'accès, de correction et de suppression, avec suivi. Réponse sous 30 jours ; la suppression anonymise le compte, les commandes gardent leurs montants sans données personnelles, et elle est refusée tant qu'une commande est en cours.
- PWA : application installable (icônes, raccourcis) et consultation hors ligne. Le service worker (`public/sw.js`) n'est actif qu'en production : `npm run build` puis `npm run preview`. Il garde l'application, les images et une page « hors ligne » ; l'application conserve elle-même une copie des données publiques du catalogue (`src/api/offlineCache.ts`), jamais les données personnelles ni celles du back-office.

## Back-office : règles ajoutées

- Commandes suspectes (19.3) : signalées par l'API à la création (montant au-delà du seuil des Paramètres, quantité inhabituelle, commandes répétées, numéro partagé, annulations répétées, remise très forte). Filtre « À vérifier », motifs dans la fiche, préparation bloquée jusqu'à la validation avec une note ; le client n'en voit rien.
- Alertes (17.6), détectées par le serveur : chaque alerte a un dossier (nouvelle, en cours, résolue, clôturée), regroupe ses répétitions, se rouvre si la situation revient, et la clôture exige une justification (et l'action effectuée pour une alerte critique). Une alerte critique non prise en charge est relancée après `settings.alertEscalationHours`.
- Retours : seul l'administrateur principal décide ; le remboursement n'est possible qu'après réception et inspection conforme.
- Stock : sortie du stock au début de la préparation, chaque mouvement est tracé par l'API (type, quantités avant et après, auteur).
- Prix : modification en masse avec aperçu (prix sous le coût d'achat signalés) ; chaque prix modifié est historisé par l'API avec son motif (fiche produit).
- Session du back-office fermée après 60 minutes sans activité. Dates affichées en JJ/MM/AAAA à l'heure du Gabon.

## Tests

`npm run test` (Vitest) couvre les règles métier et la traduction des réponses de l'API (`*.backend.test.ts`, appels HTTP simulés).

`npm run test:e2e` (Playwright) joue les parcours sur l'application complète (dossier `e2e/`) :

- commande sans compte payée à la livraison, puis suivi avec le code de suivi (mauvais code refusé) ;
- commande Airtel Money bloquée en préparation tant que le paiement n'est pas enregistré, montant partiel refusé, facture émise ;
- inscription avec le code reçu par e-mail, commande, préparation, livreur, livraison, demande de retour vue par l'équipe ;
- connexion au back-office en deux étapes, refus d'un mauvais mot de passe, écrans fermés au gestionnaire stock.

Prérequis : PostgreSQL local (identifiants de `api/.env`, droit de créer une base), dépendances de `api/` installées, et Chromium pour Playwright (`npx playwright install chromium`). Chaque lancement recrée la base `okoume_e2e`, charge les données de départ, puis démarre l'API (port 3100), le worker et le front (port 5174) ; la base de développement n'est pas touchée. Les clés Resend, Cloudinary et IA sont neutralisées : les e-mails sont écrits dans `e2e/.logs/worker.log`, où les tests lisent les codes. `npm run e2e:up` démarre le même environnement sans lancer les tests ; `npm run test:e2e` le réutilise s'il tourne déjà. Rapport en cas d'échec : `e2e/.report`.

Aussi couverts : retour accepté, reçu, inspecté et remboursé avec retrait des points ; double clic et renvoi de la commande (une seule commande) ; déclaration du paiement Mobile Money ; commande suspecte vérifiée ; rattachement d'une commande sans compte et changement d'adresse e-mail ; ouverture des 26 écrans de l'équipe et export PDF inscrit au journal.

## Accessibilité

Fenêtres et tiroirs : focus placé à l'ouverture, Tab qui reste dans la fenêtre, Échap qui ne ferme que la fenêtre du dessus, retour du focus ensuite (`src/hooks/useDialogFocus.ts`). Liens « Aller au contenu » sur la boutique et le back-office, filtres en groupe de boutons radio utilisables aux flèches, un titre h1 par page sans saut de niveau, champs tous associés à un libellé.

## Ajouts récents

- Paiements : montant, date, référence et observations enregistrés ; paiement partiel, trop-perçu, référence en double bloquée ; espèces payées seulement après confirmation de l'encaissement.
- Remboursements avec référence obligatoire (ou exception justifiée), moyen choisi, montant des seuls articles retournés ; inspection des retours (revendable ou non), stock non revendable séparé, remise en stock validée par le stock, sortie définitive par l'administrateur principal.
- Niveaux de fidélité recalculés (achats livrés et payés, nets des remboursements), seuils configurables, code de bienvenue personnel.
- Factures numérotées par série (FAC, AV), TVA détaillée par taux, avoirs à chaque remboursement ; coût réel de livraison modifiable, nouveaux frais facturés soumis à l'accord du client.
- Comptes clients : e-mail vérifié par code à l’inscription, connexion par e-mail ou téléphone, mot de passe oublié.
- Back-office : codes de secours, invitation (mot de passe et double vérification choisis par le membre, lien envoyé par e-mail), sessions fermées après suspension ou changement de rôle, page « Ma sécurité ».
- Avis refusés avec un motif communiqué ; suivi des e-mails envoyés par le worker de l'API, avec relance d'un échec ; termes recherchés dans les statistiques (avec consentement).

- Compte client supprimé directement par le client (mot de passe redemandé, anonymisation immédiate, refus tant qu'une commande est en cours) ; nombre d'adresses limité (réglable).
- Équipe : rôles standards cumulables, rôles personnalisés définis domaine par domaine et action par action (consulter, créer, modifier, publier, annuler, exporter, valider, exécuter), droit distinct pour les données sensibles (masquées sinon), sessions fermées à chaque changement de droits.
- Articles : publication programmée, titre et description SEO, historique des versions avec reprise d'une version.
- Produits récemment consultés gardés sur l’appareil.
- Assistant d'administration : recommandations complètes (période, impact, urgence, risque, bénéfice, limites), acceptation puis exécution, refus motivé, report, reconfirmation après 24 h, règles versionnées avec restauration.
- Assistant client : limite de messages par heure (20 pour un visiteur, 60 connecté), budget mensuel de requêtes (réglable) ; une suspension ne bloque jamais les achats.

- Photos des produits : ordre d'affichage et photo principale réglables ; tailles d'image adaptées à l'écran quand le service d'images le permet (Unsplash en démo, CDN de l'API en production).
- Panier et récapitulatif : prix TTC avec la TVA incluse détaillée par taux (livraison comprise au moment du choix du quartier).
- Statistiques : produits les plus consultés et cliqués (avec consentement), nouveaux produits, clients les plus actifs, réachat et délai moyen entre deux commandes, livraisons en retard et échecs, marge par variante comparée à la période précédente.
- Formulaire de livraison et adresses : champ « Instructions pour le livreur » retiré (5.2) ; les instructions des anciennes commandes restent visibles.

- Commandes : tableau avec produits, statut de livraison et livreur, demandes en cours ; passage groupé à l’étape suivante avec les mêmes contrôles qu’une par une (paiement vérifié, accord sur les frais).
- Historique des commandes : chaque étape garde l'état précédent et son auteur ; une commande livrée peut être rouverte avec un motif par une personne autorisée.
- Délai d'alerte des commandes en espèces non préparées réglable (24 h par défaut).
- Alertes réparties par domaine : chaque membre ne voit que celles de ses responsabilités ; les destinataires sont affichés.
- Journal de l'assistant d'administration : questions, réponses, décisions et actions, coordonnées masquées, réservé à l'administrateur principal.

## Branchement sur l'API

Le front a été branché sur l'API du dossier `api/` module par module ; la bascule est terminée. `VITE_BACKEND_URL` (voir `.env.example`) est obligatoire.

- **Client** : `src/api/backend.ts`. Cookies de session envoyés (`credentials: include`), jeton CSRF relu dans le cookie `ok_csrf` et renvoyé dans l'en-tête `X-CSRF-Token` pour toute écriture, enveloppe `{ success, data }` dépliée, erreurs traduites en `ApiError` (code, identifiant de requête, champs en erreur), pages parcourues par `getAll`. Sur un refus 401, la session est renouvelée une fois (`/auth/sessions/refresh`, partagé entre requêtes simultanées) puis la requête est rejouée ; si le renouvellement échoue, le compte est oublié par le navigateur.
- **Branché (phase 1)** : catégories, produits (liste et fiche), quartiers livrés. Chaque réponse est validée par un schéma zod avant d'être affichée ; `products.backend.ts` convertit le produit de l'API au format du front.
- **Branché (phase 2)** : connexion, inscription avec code reçu par e-mail, déconnexion, mot de passe oublié, profil (nom, anniversaire, notifications), adresses et favoris. `auth.backend.ts` assemble le compte du front à partir de `/auth/me`, `/me/addresses`, `/me/favorites`, `/loyalty`, `/notification-preferences` et `/orders`.
- **Compte** : changement d'e-mail ou de téléphone (mot de passe, puis code : envoyé à la nouvelle adresse, ou à l'adresse du compte pour un numéro, faute de SMS ; l'ancienne adresse est prévenue) ; rattachement d'une commande passée sans compte (numéro, code de suivi et même adresse e-mail que le compte). Les produits consultés restent sur l'appareil.
- **Branché (phase 3)** : totaux du panier et de la commande calculés par l'API (`POST /checkout/quotes`, avec ou sans quartier), passage de commande (`orders.backend.ts` n'envoie que articles, quantités, livraison, paiement, code accepté et points : jamais de prix), mes commandes, détail par numéro, suivi sans compte, annulation, réponse aux nouveaux frais de livraison, réclamation de livraison.
- **Branché (phase 3b)** : demande de retour avec photos (envoyées directement à Cloudinary avec une autorisation signée par l'API, `src/api/mediaUpload.ts`), suivi et réouverture du dossier, changement de moyen de paiement, factures et avoirs émis par l'API.
- **Règles de l'API** : le changement de moyen de paiement s'applique tout de suite, sans accord de la boutique ni motif ; un retour pour produit endommagé, défectueux ou non conforme exige au moins une photo. Les démarches d'une commande passée sans compte demandent une session ; le suivi sans compte n'affiche pas les coordonnées du destinataire (l'API ne les transmet pas).
- **Branché (phase 4a, back-office)** : connexion de l'équipe en deux étapes (mot de passe, puis code reçu par e-mail ou code de secours), renouvellement de la session de l'équipe (`/staff/auth/sessions/refresh`), déconnexion avec révocation, droits relus toutes les 30 secondes. Commandes (`adminOrders.backend.ts`) : chaque action est une transition ou une décision de l'API (avancer, confier à un livreur, échec de livraison, annuler, rouvrir, coût réel de course, nouveaux frais, décision sur une annulation, clôture d'une réclamation), encaissements et remboursements (facture, avoir et points traités par le serveur), livreurs, quartiers livrés (`adminZones.backend.ts`).
- **Branché (phase 4b, catalogue)** : catégories et collections, produits et variantes (`adminCatalog.backend.ts` n'envoie que les changements réels, chacun à sa route : champs, statut, variante modifiée ou ajoutée ; une variante retirée du formulaire n'est pas supprimée), stock par mouvement (quantité comptée, motif, auteur tracé par l'API), sortie du stock non revendable à son coût d'achat. Les images partent directement chez Cloudinary avec une autorisation signée par l'API (`staffImageUploader`, prop `uploader` des composants d'envoi). Journal général des mouvements de stock et historique des prix lus sur l'API (100 derniers).
- **Branché (phase 4c)** : retours côté équipe (`adminCommerce.backend.ts` : dossier rattaché à sa commande, décision motivée avec prise en charge des frais de renvoi, réception, inspection conforme ou non, remise en stock), codes promo (une limite d'utilisation vide signifie sans limite ; un code de livraison offerte peut avoir une valeur de 0), factures et avoirs émis par l'API. Un membre sans droit sur les retours voit les commandes sans leurs dossiers.
- **Place de marché, côté acheteur (phase 5a)**. Écrans : `/annonces` (recherche, catégorie, type, état, ville, prix, tri ; critères dans l'adresse pour partager une recherche), recherche « Autour de moi » (position demandée au navigateur, envoyée dans le corps de `POST /listings/searches`, jamais dans l'adresse ni conservée ; distance affichée arrondie), `/annonces/:slug` (photos, prix, état, lieu, boutique et badge vérifié, partage par la page d'aperçu de l'API, signalement), demande d'achat (paiement et remise parmi ceux de la boutique, téléphone communiqué au vendeur après acceptation), `/compte/demandes` (suivi, téléphone du vendeur après acceptation, annulation), `/compte/messages` et le tchat (relève des nouveaux messages toutes les 4 secondes onglet visible, prix convenu affiché tant qu'il est valable, l'assistant de la boutique nommé comme tel). Code : `src/features/marketplace/`.
- **Place de marché, espace vendeur (phase 5b)** : `/vendeur`, accessible depuis le compte. Sans boutique, ouverture (fiche, paiements et remises acceptés, offre d'accès). Ensuite : tableau de bord (demandes et conversations en attente, annonces par état, visites sur 30 jours), boutique et offre (passage sur une offre gratuite, paiement Mobile Money déclaré avec sa référence puis vérifié par l'équipe, historique), annonces (brouillon, photos envoyées à Cloudinary avec l'autorisation de la boutique, prix minimum privé et consignes pour le tchat, soumission à la vérification, corrections demandées affichées, retrait, lien de partage, visites, mise en avant payante), demandes reçues (accepter, refuser motivé, vente conclue ou non), conversations (filtre « attendent ma réponse », réponse du vendeur, prix convenu proposé). Le fil de messages et la relève sont partagés avec l'acheteur (`ChatThread`, `useChat`). Code : `src/features/seller/`, `src/pages/seller/`.
- **Branché (étapes de finition)** : réglages publics (`GET /settings`) et codes promo publics ; fidélité du client (mouvements, codes personnels) ; modération de la place de marché (`/admin/place-de-marche` : annonces, signalements, boutiques, paiements d'abonnement, mises en avant, offres) ; notifications push sur l'appareil (`src/lib/devicePush.ts`, client et équipe) ; assistance (`support.backend.ts` : demandes avec photos pour un client connecté, réponses de l'équipe, clôture motivée) ; données personnelles (`privacy.backend.ts` : demandes, export préparé par l'API, suppression du compte par anonymisation côté serveur, suivi par l'équipe) ; avis (`reviews.backend.ts` : notes calculées par l'API, avis sur un produit reçu, photos, signalement, modération) ; contenus (`content.backend.ts` : bannières, publicités en cours, offres, articles, pages légales, écrans Contenus et Éditorial) ; paramètres (`adminSettings.backend.ts`, les règles fixées par le serveur apparaissent grisées).
- **Paiements et commandes** : le client déclare son paiement Mobile Money (référence reçue par SMS), depuis la confirmation, son compte ou le suivi sans compte ; la commande passe « À vérifier » et l'équipe retrouve la référence pré-remplie. Mot de passe oublié de l'équipe : code reçu par e-mail et code de secours (deux facteurs), sinon nouvelle invitation. Les champs « Observations » et le motif du coût de course, jamais conservés, ont été retirés des fenêtres.
- **Limites de ces branchements** : pièces jointes d'assistance en images seulement (pas de PDF), et pas de pièce jointe sans compte ; une demande d'assistance s'attribue à tout membre actif (annuaire de l'équipe lu sur l'API) ; contrat d'annonceur non stocké ; le panneau des durées de conservation indique ce que l'API applique réellement (seule l'anonymisation des comptes inactifs est automatique) ; le fichier client de l'écran Données personnelles n'est pas lu (l'export passe par l'API).

Limites connues :

- Sans compte, la page de confirmation n'est plus consultable après un rechargement : la commande se retrouve avec son numéro et son code de suivi.
- L'API publie un niveau de disponibilité, pas le stock exact : le front reproduit ce niveau, sans réservation.
- La recherche et les filtres restent faits dans le navigateur sur le catalogue complet (100 produits par page, 20 pages au plus).
- En production, l'API doit avoir `COOKIE_DOMAIN=.okoume.ga` : sans lui, le cookie CSRF posé par api.okoume.ga n'est pas lisible depuis okoume.ga et toute écriture est refusée (403).

## Ce qui reste simplifié

Authentification, atomicité des commandes, contrôles d'accès, envoi des e-mails, détection des alertes, points de fidélité et anonymisation sont faits par l'API (dossier `api/`). Restent côté navigateur :

- **Assistant d'achat** : moteur à règles local (`features/assistant/assistant.engine.ts`), à brancher sur un modèle d'IA côté serveur sans changer l'interface.

Les textes légaux (`src/pages/legalContent.ts`) sont des modèles à faire valider par un juriste.

## Animations

Animations réalisées avec Motion : carrousel d'accueil, apparition des sections au défilement, survol des cartes produit, produit qui « vole » vers le panier, tiroirs et fenêtres, indicateurs d'onglets, frise de suivi de commande, coche animée de confirmation. Elles respectent le réglage système « réduire les animations » (`MotionConfig reducedMotion="user"`).
