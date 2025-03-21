# Application Desktop AI

Une application de bureau Electron qui encapsule l'interface web de chat AI dans une fenêtre native.

## Structure du projet

Le projet a été restructuré pour une meilleure organisation et maintenabilité :

```
app/
├── main.js                 # Point d'entrée principal
├── preload.js              # Script de préchargement pour la webview
├── icons/                  # Icônes de l'application
├── config/             # Configuration et constantes
│   └── config.js       # Configuration globale de l'application
├── ipc/                # Gestionnaires d'événements IPC
│   └── ipc-handlers.js # Gestion des communications avec le renderer
├── services/           # Services principaux
│   ├── auto-updater.js # Gestion des mises à jour automatiques
│   ├── tray-service.js # Gestion de l'icône dans la barre des tâches
│   └── window-service.js # Création et gestion des fenêtres
└── utils/              # Utilitaires
    ├── file-utils.js   # Utilitaires pour les fichiers
    ├── icon-utils.js   # Utilitaires pour les icônes
    ├── menu-utils.js   # Utilitaires pour les menus
    ├── platform-utils.js # Utilitaires spécifiques aux plateformes
    └── window-effects.js # Effets visuels pour les fenêtres
```

## Fonctionnalités

- 🌐 Encapsulation d'une application web dans une fenêtre native
- 🔄 Mises à jour automatiques
- 🖼️ Icône dans la barre des tâches/le dock
- 🔝 Option "Toujours au premier plan"
- 🚀 Lancement au démarrage du système
- 🖱️ Glisser-déposer pour déplacer la fenêtre
- 📱 Interface redimensionnable
- 🌙 Animations d'apparition/disparition
- 📸 Menu contextuel pour les images
- 🔄 Réinitialisation de la fenêtre

## Plateformes supportées

- Windows
- macOS
- Linux (support partiel)

## Prérequis

- Node.js 18+ et npm

## Installation

### Pour les utilisateurs

1. Téléchargez la dernière version depuis la page [Releases](https://github.com/acaryca/ai-app-desktop/releases)
2. Installez l'application en suivant les instructions spécifiques à votre système d'exploitation
3. L'application se lancera automatiquement après l'installation

### Pour les développeurs

Clonez le dépôt et installez les dépendances :

```bash
git clone https://github.com/acaryca/ai-app-desktop.git
cd ai-app-desktop
npm install
```

## Développement

Pour lancer l'application en mode développement :

```bash
npm start
```

## Construction

Pour construire l'application pour toutes les plateformes :

```bash
npm run build
```

Pour construire pour une plateforme spécifique :

```bash
# Windows
npm run package:win

# macOS
npm run package:mac

# Linux
npm run package:linux
```

Les fichiers d'installation se trouveront dans le dossier `dist/`.

## Génération d'icônes

Pour générer les icônes à partir d'une image source :

```bash
npm run make-icon
```

Cette commande utilise l'image source dans `dev/icon/source.png` pour générer des icônes de différentes tailles et formats pour toutes les plateformes.

## Licence

ISC

## Auteur

ACARY (support@acary.ca) 