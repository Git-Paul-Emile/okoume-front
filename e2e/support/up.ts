import { startStack, WEB_URL } from './stack';

// Démarre l'environnement de test sans lancer les parcours (exploration manuelle) ; Ctrl+C pour arrêter.
await startStack();
console.log(`Environnement prêt : ${WEB_URL}`);
