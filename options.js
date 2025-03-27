const path = require('path');
const { screen } = require('electron');

// Dimensions par défaut de la fenêtre
const DEFAULT_WINDOW_SIZE = {
  width: 400,
  height: 700
};

// Configuration de electron-store
const STORE_DEFAULTS = {
  isAlwaysOnTop: true,
  animationsEnabled: false,
  openAtStartup: true,
  windowPosition: {
    x: 0,
    y: 0
  },
  windowSize: {
    width: DEFAULT_WINDOW_SIZE.width,
    height: DEFAULT_WINDOW_SIZE.height
  }
};

// Animations de la fenêtre
const ANIMATIONS = {
  enabled: false, // Sera mis à jour après le chargement du store
  fadeStep: 0.15,
  fadeInterval: 5
};

// Configuration des icônes
function getIconPath() {
  if (process.platform === 'win32') {
    // Sur Windows, utiliser l'icône ICO pour une meilleure qualité
    return path.join(__dirname, 'assets', 'icon.ico');
  } else if (process.platform === 'darwin') {
    // Sur macOS, utiliser une icône de template pour le mode sombre/clair
    return path.join(__dirname, 'assets', 'icon-template.png');
  } else {
    // Sur Linux et autres plateformes, choisir selon la résolution
    const { scaleFactor } = screen.getPrimaryDisplay();
    
    if (scaleFactor <= 1) {
      return path.join(__dirname, 'assets', 'icon-16.png');
    } else if (scaleFactor <= 1.5) {
      return path.join(__dirname, 'assets', 'icon-24.png');
    } else if (scaleFactor <= 2) {
      return path.join(__dirname, 'assets', 'icon-32.png');
    } else {
      return path.join(__dirname, 'assets', 'icon-48.png');
    }
  }
}

// Configuration de la fenêtre principale
const WINDOW_CONFIG = {
  show: false,
  frame: false,
  resizable: true,
  skipTaskbar: true,
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    preload: path.join(__dirname, 'preload.js'),
    webSecurity: false,
    allowRunningInsecureContent: true
  },
  // Permettre de faire glisser la fenêtre
  draggable: true,
  // Empêcher le comportement par défaut du navigateur pour le déplacement
  titleBarStyle: 'hidden'
};

// URL de l'application
const APP_URL = 'https://ai.acary.app/chat';

// Menu contextuel standard pour clic droit dans la fenêtre
const CONTEXT_MENU_TEMPLATE = [
  { label: 'Copier', role: 'copy' },
  { label: 'Coller', role: 'paste' },
  { type: 'separator' },
  { label: 'Sélectionner tout', role: 'selectAll' }
];

// Menu contextuel pour les images
const IMAGE_MENU_TEMPLATE = (data) => [
  { 
    label: 'Télécharger l\'image', 
    click: 'download-image' // Action à gérer dans main.js
  },
  { type: 'separator' },
  { 
    label: 'Copier l\'URL de l\'image', 
    click: () => require('electron').clipboard.writeText(data.srcUrl)
  }
];

// Template de menu pour macOS
const MAC_MENU_TEMPLATE = (app) => [
  {
    label: app.name,
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  },
  {
    label: 'Edition',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' }
    ]
  }
];

// Options de la boîte de dialogue pour sauvegarder des images
const SAVE_IMAGE_OPTIONS = (app, filename) => ({
  title: 'Enregistrer l\'image',
  defaultPath: path.join(app.getPath('downloads'), filename),
  filters: [
    { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
    { name: 'Tous les fichiers', extensions: ['*'] }
  ]
});

// Template pour le menu de la barre des tâches
const getTrayMenuTemplate = (isAlwaysOnTop, animationsEnabled, openAtStartup) => [
  { 
    label: 'Ouvrir', 
    click: 'open-window'
  },
  { 
    label: 'Toujours au premier plan', 
    type: 'checkbox',
    checked: isAlwaysOnTop,
    click: 'toggle-always-on-top'
  },
  { 
    label: 'Animations', 
    type: 'checkbox',
    checked: animationsEnabled,
    click: 'toggle-animations'
  },
  { 
    label: 'Lancer au démarrage', 
    type: 'checkbox',
    checked: openAtStartup,
    click: 'toggle-startup'
  },
  { 
    label: 'Réinitialiser la fenêtre', 
    click: 'reset-window'
  },
  { type: 'separator' },
  { 
    label: 'Quitter', 
    click: 'quit-app'
  }
];

// Options supplémentaires pour le menu sur macOS
const MAC_TRAY_EXTRAS = [
  { type: 'separator' },
  { 
    label: 'Services', 
    role: 'services' 
  }
];

// Exporter les options
module.exports = {
  DEFAULT_WINDOW_SIZE,
  STORE_DEFAULTS,
  ANIMATIONS,
  getIconPath,
  WINDOW_CONFIG,
  APP_URL,
  CONTEXT_MENU_TEMPLATE,
  IMAGE_MENU_TEMPLATE,
  MAC_MENU_TEMPLATE,
  SAVE_IMAGE_OPTIONS,
  getTrayMenuTemplate,
  MAC_TRAY_EXTRAS
}; 