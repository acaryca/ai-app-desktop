# AI Win App

Une application Electron qui ajoute une icône dans la barre des tâches Windows et ouvre une fenêtre affichant `localhost:3000/chat` lorsqu'on clique dessus.

## Prérequis

- Node.js (v14 ou supérieur)
- npm (v6 ou supérieur)
- Un serveur web local fonctionnant sur `localhost:3000/chat`

## Installation

1. Clonez ce dépôt :
   ```
   git clone https://github.com/acaryca/ai-win-app.git
   cd ai-win-app
   ```

2. Installez les dépendances :
   ```
   npm install
   ```

## Utilisation

### Développement

Pour lancer l'application en mode développement :

```
npm start
```

**Note importante :** Assurez-vous que votre serveur web local est en cours d'exécution sur `localhost:3000/chat` avant de démarrer l'application.

### Construction de l'application

Pour construire l'application pour Windows :

```
npm run build
```

Le fichier d'installation sera créé dans le dossier `dist`.

## Fonctionnalités

- Icône dans la barre des tâches Windows (system tray)
- Ouverture d'une fenêtre affichant `localhost:3000/chat` au clic sur l'icône
- Menu contextuel avec options "Ouvrir" et "Quitter"
- La fenêtre se positionne automatiquement dans le coin inférieur droit de l'écran
- L'application continue de fonctionner en arrière-plan lorsque la fenêtre est fermée

## Licence

ISC 