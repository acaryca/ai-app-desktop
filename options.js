const path = require('path');
const { screen } = require('electron');

// Default window dimensions
const DEFAULT_WINDOW_SIZE = {
  width: 400,
  height: 700
};

// Electron-store configuration
const STORE_DEFAULTS = {
  isAlwaysOnTop: true,
  animationsEnabled: false,
  openAtStartup: true,
  language: null, // Will be determined by system locale
  windowPosition: {
    x: 0,
    y: 0
  },
  windowSize: {
    width: DEFAULT_WINDOW_SIZE.width,
    height: DEFAULT_WINDOW_SIZE.height
  }
};

// Window animations
const ANIMATIONS = {
  enabled: false, // Will be updated after loading the store
  fadeStep: 0.15,
  fadeInterval: 5
};

// Icons configuration
function getIconPath() {
  if (process.platform === 'win32') {
    // On Windows, use ICO icon for better quality
    return path.join(__dirname, 'assets', 'icon.ico');
  } else if (process.platform === 'darwin') {
    // On macOS, use a template icon for dark/light mode
    return path.join(__dirname, 'assets', 'icon-template.png');
  } else {
    // On Linux and other platforms, choose according to resolution
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

// Main window configuration
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
  // Allow window dragging
  draggable: true,
  // Prevent default browser behavior for drag-and-drop
  titleBarStyle: 'hidden'
};

// Application URL
const APP_URL = 'https://ai.acary.app/chat';

// Standard context menu for right-click in window
const getContextMenuTemplate = (i18n) => [
  { label: i18n.t('context.copy'), role: 'copy' },
  { label: i18n.t('context.paste'), role: 'paste' },
  { type: 'separator' },
  { label: i18n.t('context.selectAll'), role: 'selectAll' }
];

// Context menu for images
const getImageMenuTemplate = (data, i18n) => [
  { 
    label: i18n.t('context.downloadImage'), 
    click: 'download-image' // Action to handle in main.js
  },
  { type: 'separator' },
  { 
    label: i18n.t('context.copyImageUrl'), 
    click: () => require('electron').clipboard.writeText(data.srcUrl)
  }
];

// Menu template for macOS
const getMacMenuTemplate = (app, i18n) => [
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
    label: i18n.t('menu.edit'),
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

// Dialog options for saving images
const getSaveImageOptions = (app, filename, i18n) => ({
  title: i18n.t('dialog.save.title'),
  defaultPath: path.join(app.getPath('downloads'), filename),
  filters: [
    { name: i18n.t('dialog.save.images'), extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
    { name: i18n.t('dialog.save.allFiles'), extensions: ['*'] }
  ]
});

// Template for the system tray menu
const getTrayMenuTemplate = (isAlwaysOnTop, animationsEnabled, openAtStartup, i18n) => {
  const template = [
    { 
      label: i18n.t('tray.open'), 
      click: 'open-window'
    },
    { 
      label: i18n.t('tray.checkUpdates'), 
      click: 'check-updates'
    },
    { 
      label: i18n.t('tray.alwaysOnTop'), 
      type: 'checkbox',
      checked: isAlwaysOnTop,
      click: 'toggle-always-on-top'
    },
    { 
      label: i18n.t('tray.animations'), 
      type: 'checkbox',
      checked: animationsEnabled,
      click: 'toggle-animations'
    },
    { 
      label: i18n.t('tray.launchAtStartup'), 
      type: 'checkbox',
      checked: openAtStartup,
      click: 'toggle-startup'
    },
    { 
      label: i18n.t('tray.resetWindow'), 
      click: 'reset-window'
    }
  ];
  
  // Add language selector submenu
  const languages = i18n.getAvailableLanguages();
  if (languages.length > 1) {
    const currentLang = i18n.getLanguage();
    const langSubmenu = languages.map(lang => ({
      label: lang.toUpperCase(),
      type: 'radio',
      checked: lang === currentLang,
      click: `set-language-${lang}`
    }));
    
    template.push({
      label: 'Language', // This will be shown regardless of language
      submenu: langSubmenu
    });
  }
  
  template.push({ type: 'separator' });
  template.push({ 
    label: i18n.t('tray.quit'), 
    click: 'quit-app'
  });
  
  return template;
};

// Additional options for menu on macOS
const getMacTrayExtras = (i18n) => [
  { type: 'separator' },
  { 
    label: i18n.t('tray.services'), 
    role: 'services' 
  }
];

// Export options
module.exports = {
  DEFAULT_WINDOW_SIZE,
  STORE_DEFAULTS,
  ANIMATIONS,
  getIconPath,
  WINDOW_CONFIG,
  APP_URL,
  getContextMenuTemplate,
  getImageMenuTemplate,
  getMacMenuTemplate,
  getSaveImageOptions,
  getTrayMenuTemplate,
  getMacTrayExtras
}; 