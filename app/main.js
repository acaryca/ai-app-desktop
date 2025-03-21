const { app, BrowserWindow, Tray, Menu, screen, MenuItem, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const options = require('./options'); // Importer le module options
const { autoUpdater } = require('electron-updater');

// Définir le nom de l'application
app.name = 'AI';

// État global de l'application
const appState = {
  mainWindow: null,
  tray: null,
  isQuitting: false,
  isAlwaysOnTop: true,
  animationsEnabled: false,
  openAtStartup: true
};

// Configuration et initialisation de l'application
async function init() {
  try {
    // Importer electron-store dynamiquement
    const { default: Store } = await import('electron-store');
    
    // Configuration du stockage persistant
    const store = new Store({
      defaults: options.STORE_DEFAULTS
    });
    
    // Charger les paramètres enregistrés
    appState.isAlwaysOnTop = store.get('isAlwaysOnTop');
    appState.animationsEnabled = store.get('animationsEnabled');
    appState.openAtStartup = store.get('openAtStartup');
    options.ANIMATIONS.enabled = appState.animationsEnabled;
    
    // Configurer le démarrage automatique
    setAutoLaunch(appState.openAtStartup);
    
    // Créer l'interface utilisateur
    createTray(store);
    createWindow(store);
    
    // Configurer le menu selon la plateforme
    configureMenu();
    
    // Configurer les événements spécifiques à la plateforme
    configurePlatformSpecifics();
    
    // Configurer la gestion du déplacement de la fenêtre
    setupWindowDrag();
    
    // Configurer et démarrer la vérification des mises à jour
    setupAutoUpdater();
  } catch (error) {
    console.error('Erreur lors de l\'initialisation:', error);
  }
}

// Fonction pour configurer la mise à jour automatique
function setupAutoUpdater() {
  // Désactiver les messages dans la console
  autoUpdater.logger = null;
  
  // Événements de mise à jour
  autoUpdater.on('checking-for-update', () => {
    console.log('Vérification des mises à jour...');
  });
  
  autoUpdater.on('update-available', (info) => {
    console.log('Mise à jour disponible:', info.version);
  });
  
  autoUpdater.on('update-not-available', () => {
    console.log('Aucune mise à jour disponible');
  });
  
  autoUpdater.on('download-progress', (progressObj) => {
    const message = `Téléchargement: ${progressObj.percent.toFixed(2)}%`;
    console.log(message);
    
    // Notifier la fenêtre principale du progrès si elle existe
    if (appState.mainWindow?.webContents) {
      appState.mainWindow.webContents.send('update-progress', progressObj);
    }
  });
  
  autoUpdater.on('update-downloaded', (info) => {
    console.log('Mise à jour téléchargée', info);
    
    // Notifier l'utilisateur
    dialog.showMessageBox({
      type: 'info',
      title: 'Mise à jour disponible',
      message: `La version ${info.version} a été téléchargée et sera installée au prochain démarrage de l'application.`,
      buttons: ['Redémarrer maintenant', 'Plus tard'],
      defaultId: 0
    }).then(result => {
      if (result.response === 0) {
        appState.isQuitting = true;
        autoUpdater.quitAndInstall();
      }
    });
  });
  
  autoUpdater.on('error', (err) => {
    console.error('Erreur lors de la mise à jour:', err);
  });
  
  // Vérifier les mises à jour après un délai de démarrage (5 secondes)
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(err => {
      console.error('Erreur lors de la vérification des mises à jour:', err);
    });
  }, 5000);
}

// Fonction pour configurer le déplacement de la fenêtre
function setupWindowDrag() {
  // Événement pour démarrer le déplacement de la fenêtre
  ipcMain.on('window-drag', () => {
    if (appState.mainWindow) {
      // Envoyer un événement à la fenêtre pour indiquer que le drag a commencé
      appState.mainWindow.webContents.send('window-drag-started');
    }
  });
  
  // Ajouter un gestionnaire d'événements pour ouvrir les liens dans le navigateur par défaut
  ipcMain.on('open-in-browser', (event, url) => {
    shell.openExternal(url).catch(err => {
      console.error('Erreur lors de l\'ouverture du lien:', err);
    });
  });
}

// Fonctions pour les effets de fondu
function openWindowWithEffect(window, callback = null) {
  if (!options.ANIMATIONS.enabled) {
    window.show();
    if (callback) callback();
    return;
  }
  
  window.setOpacity(0);
  window.show();
  
  let opacity = 0;
  const fadeStep = options.ANIMATIONS.fadeStep;
  const fadeInterval = setInterval(() => {
    if (opacity < 1) {
      opacity += fadeStep;
      window.setOpacity(opacity);
    } else {
      clearInterval(fadeInterval);
      if (callback) callback();
    }
  }, options.ANIMATIONS.fadeInterval);
}

function closeWindowWithEffect(window, callback = null) {
  if (!options.ANIMATIONS.enabled) {
    window.hide();
    if (callback) callback();
    return;
  }
  
  let opacity = 1;
  const fadeStep = options.ANIMATIONS.fadeStep;
  const fadeInterval = setInterval(() => {
    if (opacity > 0) {
      opacity -= fadeStep;
      window.setOpacity(opacity);
    } else {
      clearInterval(fadeInterval);
      window.hide();
      window.setOpacity(1); // Réinitialiser l'opacité pour la prochaine ouverture
      if (callback) callback();
    }
  }, options.ANIMATIONS.fadeInterval);
}

function createWindow(store) {
  // Créer la fenêtre du navigateur.
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  // Récupérer la taille enregistrée avant de calculer la position
  const savedSize = store.get('windowSize');
  const windowWidth = savedSize.width || options.DEFAULT_WINDOW_SIZE.width;
  const windowHeight = savedSize.height || options.DEFAULT_WINDOW_SIZE.height;
  
  // Déterminer la position de la fenêtre
  const windowPosition = getWindowPosition(store, width, height, windowWidth, windowHeight);
  
  // Créer la fenêtre avec les paramètres calculés
  appState.mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: windowPosition.x,
    y: windowPosition.y,
    alwaysOnTop: appState.isAlwaysOnTop,
    ...options.WINDOW_CONFIG
  });

  // Forcer la position après la création de la fenêtre pour s'assurer qu'elle est correcte
  appState.mainWindow.setPosition(windowPosition.x, windowPosition.y);
  
  // Charger l'URL
  appState.mainWindow.loadURL(options.APP_URL);

  // Ajouter un effet de fondu lors de l'affichage de la fenêtre
  appState.mainWindow.once('ready-to-show', () => {
    // Vérifier une dernière fois la position avant d'afficher
    appState.mainWindow.setPosition(windowPosition.x, windowPosition.y);
    openWindowWithEffect(appState.mainWindow);
  });

  // Sauvegarder la position et la taille de la fenêtre lorsqu'elle est déplacée ou redimensionnée
  appState.mainWindow.on('moved', () => {
    const bounds = appState.mainWindow.getBounds();
    const newPosition = { x: bounds.x, y: bounds.y };
    console.log('Position mise à jour après déplacement:', newPosition);
    store.set('windowPosition', newPosition);
  });
  
  appState.mainWindow.on('resized', () => {
    const bounds = appState.mainWindow.getBounds();
    store.set('windowSize', { width: bounds.width, height: bounds.height });
  });

  // Créer un menu contextuel pour le clic droit
  const contextMenu = Menu.buildFromTemplate(options.CONTEXT_MENU_TEMPLATE);

  // Ajouter l'événement pour le clic droit
  appState.mainWindow.webContents.on('context-menu', (e, params) => {
    contextMenu.popup({ window: appState.mainWindow, x: params.x, y: params.y });
  });

  // Gérer le menu contextuel spécifique aux images
  setupImageContextMenu();

  // Émis lorsque la fenêtre est fermée
  appState.mainWindow.on('close', (event) => {
    if (!appState.isQuitting) {
      event.preventDefault();
      closeWindowWithEffect(appState.mainWindow);
      return false;
    }
    return true;
  });
}

// Déterminer la position de la fenêtre
function getWindowPosition(store, screenWidth, screenHeight, windowWidth, windowHeight) {
  // Récupérer la position enregistrée ou en définir une par défaut
  const savedPosition = store.get('windowPosition');
  
  if (savedPosition && savedPosition.x !== undefined && savedPosition.y !== undefined && 
      savedPosition.x > 0 && savedPosition.y > 0) {
    // Utiliser la position sauvegardée seulement si elle semble valide
    console.log('Utilisation de la position sauvegardée:', savedPosition);
    return savedPosition;
  } else {
    // Calculer la position en bas à droite avec une marge de 10px
    const newPosition = {
      x: screenWidth - windowWidth - 10,
      y: screenHeight - windowHeight - 10
    };
    console.log('Nouvelle position calculée en bas à droite:', newPosition);
    
    // Enregistrer cette position par défaut
    store.set('windowPosition', newPosition);
    return newPosition;
  }
}

// Configurer le menu contextuel pour les images
function setupImageContextMenu() {
  ipcMain.on('image-context-menu', (event, data) => {
    // Créer un template de menu pour les images
    const imageMenuTemplate = options.IMAGE_MENU_TEMPLATE(data);
    
    // Remplacer l'action 'download-image' par la fonction réelle
    const downloadImageItem = imageMenuTemplate.find(item => item.click === 'download-image');
    if (downloadImageItem) {
      downloadImageItem.click = async () => {
        // Demander à l'utilisateur où enregistrer l'image
        const parsedUrl = new URL(data.srcUrl);
        const filename = path.basename(parsedUrl.pathname) || 'image.png';
        
        const saveOptions = options.SAVE_IMAGE_OPTIONS(app, filename);
        
        try {
          const { canceled, filePath } = await dialog.showSaveDialog(appState.mainWindow, saveOptions);
          
          if (!canceled && filePath) {
            // Télécharger l'image
            downloadImage(data.srcUrl, filePath);
          }
        } catch (error) {
          console.error('Erreur lors de la boîte de dialogue de sauvegarde:', error);
        }
      };
    }
    
    const imageMenu = Menu.buildFromTemplate(imageMenuTemplate);
    imageMenu.popup({ 
      window: appState.mainWindow, 
      x: data.x, 
      y: data.y 
    });
  });
}

function createTray(store) {
  // Utiliser l'icône appropriée selon la plateforme et la résolution d'écran
  const iconPath = options.getIconPath();
  
  // Créer l'icône de la barre des tâches
  appState.tray = new Tray(iconPath);
  
  // Obtenir le template du menu
  let menuTemplate = options.getTrayMenuTemplate(
    appState.isAlwaysOnTop, 
    appState.animationsEnabled, 
    appState.openAtStartup
  );
  
  // Remplacer les actions génériques par des fonctions spécifiques
  menuTemplate = replaceMenuActions(menuTemplate, store);
  
  // Ajouter des options spécifiques à macOS
  if (process.platform === 'darwin') {
    // Insérer les éléments supplémentaires après l'option "Réinitialiser la fenêtre"
    menuTemplate.splice(4, 0, ...options.MAC_TRAY_EXTRAS);
  }
  
  const contextMenu = Menu.buildFromTemplate(menuTemplate);
  appState.tray.setToolTip('AI');
  appState.tray.setContextMenu(contextMenu);
  
  // Clic sur l'icône pour ouvrir l'application
  appState.tray.on('click', () => {
    toggleMainWindow(store);
  });
}

// Remplacer les actions du menu par des fonctions réelles
function replaceMenuActions(menuTemplate, store) {
  const actionHandlers = {
    'open-window': () => toggleMainWindow(store),
    'toggle-always-on-top': () => {
      appState.isAlwaysOnTop = !appState.isAlwaysOnTop;
      if (appState.mainWindow) {
        appState.mainWindow.setAlwaysOnTop(appState.isAlwaysOnTop);
      }
      store.set('isAlwaysOnTop', appState.isAlwaysOnTop);
    },
    'toggle-animations': () => {
      appState.animationsEnabled = !appState.animationsEnabled;
      options.ANIMATIONS.enabled = appState.animationsEnabled;
      store.set('animationsEnabled', appState.animationsEnabled);
    },
    'toggle-startup': () => {
      appState.openAtStartup = !appState.openAtStartup;
      setAutoLaunch(appState.openAtStartup);
      store.set('openAtStartup', appState.openAtStartup);
    },
    'check-for-updates': () => checkForUpdates(),
    'reset-window': () => resetWindowPosition(store),
    'quit-app': () => {
      appState.isQuitting = true;
      app.quit();
    }
  };
  
  return menuTemplate.map(item => {
    if (item.click && typeof item.click === 'string' && actionHandlers[item.click]) {
      return { ...item, click: actionHandlers[item.click] };
    }
    return item;
  });
}

// Fonction pour vérifier les mises à jour
function checkForUpdates() {
  autoUpdater.checkForUpdatesAndNotify()
    .then(() => {
      dialog.showMessageBox({
        type: 'info',
        title: 'Recherche de mises à jour',
        message: 'La recherche de mises à jour a été lancée. Vous serez notifié si une mise à jour est disponible.'
      });
    })
    .catch(err => {
      dialog.showErrorBox('Erreur', `Impossible de vérifier les mises à jour: ${err.message}`);
    });
}

// Fonction pour réinitialiser la position de la fenêtre
function resetWindowPosition(store) {
  if (appState.mainWindow) {
    // Réinitialiser les dimensions
    appState.mainWindow.setSize(options.DEFAULT_WINDOW_SIZE.width, options.DEFAULT_WINDOW_SIZE.height);
    
    // Calculer la position en bas à droite
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const newPosition = {
      x: width - options.DEFAULT_WINDOW_SIZE.width - 10,
      y: height - options.DEFAULT_WINDOW_SIZE.height - 10
    };
    
    // Appliquer la nouvelle position
    appState.mainWindow.setPosition(newPosition.x, newPosition.y);
    
    // Sauvegarder les paramètres réinitialisés
    store.set('windowSize', options.DEFAULT_WINDOW_SIZE);
    store.set('windowPosition', newPosition);
    
    console.log('Fenêtre réinitialisée - Dimensions:', options.DEFAULT_WINDOW_SIZE, 'Position:', newPosition);
  }
}

// Fonction pour basculer l'affichage de la fenêtre principale
function toggleMainWindow(store) {
  if (appState.mainWindow === null) {
    createWindow(store);
  } else {
    if (appState.mainWindow.isVisible()) {
      closeWindowWithEffect(appState.mainWindow);
    } else {
      openWindowWithEffect(appState.mainWindow);
    }
  }
}

function configureMenu() {
  // Créer le menu de l'application pour macOS
  if (process.platform === 'darwin') {
    const menu = Menu.buildFromTemplate(options.MAC_MENU_TEMPLATE(app));
    Menu.setApplicationMenu(menu);
  } else {
    // Sur Windows et Linux, on peut cacher le menu
    Menu.setApplicationMenu(null);
  }
}

function configurePlatformSpecifics() {
  // Configuration spécifique pour macOS
  if (process.platform === 'darwin') {
    // Cacher l'icône du dock par défaut (application en mode tray uniquement)
    app.dock.hide();
    
    // Montrer l'icône du dock quand la fenêtre est visible
    app.on('browser-window-created', () => {
      if (!app.dock.isVisible()) {
        app.dock.show();
      }
    });
    
    // Cacher l'icône du dock quand toutes les fenêtres sont fermées
    app.on('window-all-closed', () => {
      if (app.dock.isVisible()) {
        app.dock.hide();
      }
    });
  }
}

// Fonction pour télécharger une image
function downloadImage(imageUrl, filePath) {
  const protocol = imageUrl.startsWith('https:') ? require('https') : require('http');
  const fs = require('fs');
  
  const file = fs.createWriteStream(filePath);
  
  protocol.get(imageUrl, (response) => {
    // Vérifier si la réponse est une redirection
    if (response.statusCode === 301 || response.statusCode === 302) {
      // Suivre la redirection
      downloadImage(response.headers.location, filePath);
      return;
    }
    
    // Pipe le flux de données vers le fichier
    response.pipe(file);
    
    file.on('finish', () => {
      file.close();
      // Notifier l'utilisateur que le téléchargement est terminé
      if (appState.mainWindow) {
        appState.mainWindow.webContents.send('download-complete', {
          success: true,
          filePath: filePath
        });
      }
    });
  }).on('error', (err) => {
    fs.unlink(filePath, () => {}); // Supprimer le fichier en cas d'erreur
    if (appState.mainWindow) {
      appState.mainWindow.webContents.send('download-complete', {
        success: false,
        error: err.message
      });
    }
  });
}

// Événements de l'application

// Cette méthode sera appelée quand Electron aura fini de s'initialiser
app.whenReady().then(() => {
  init();
  
  app.on('activate', () => {
    // Sur macOS, il est commun de re-créer une fenêtre de l'application quand
    // l'icône du dock est cliquée et qu'il n'y a pas d'autres fenêtres d'ouvertes.
    if (BrowserWindow.getAllWindows().length === 0) {
      init();
    }
  });
});

// Quitter quand toutes les fenêtres sont fermées, sauf sur macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Gestion propre de la fermeture de l'application
app.on('before-quit', () => {
  appState.isQuitting = true;
});

// Fonction pour configurer le démarrage automatique
function setAutoLaunch(enable) {
  // Différent selon la plateforme
  if (process.platform === 'win32') {
    app.setLoginItemSettings({
      openAtLogin: enable,
      path: process.execPath,
      name: 'AI',
      args: ['--processStart', `"AI"`, '--manufacturer', 'ACARY'],
      openAsHidden: true
    });
  } else if (process.platform === 'darwin') {
    app.setLoginItemSettings({
      openAtLogin: enable,
      openAsHidden: true
    });
  } else {
    // Sur Linux, nous devrions créer un fichier .desktop
    // Cela pourrait nécessiter des privilèges ou l'utilisation d'un package externe
    console.log('Configuration du démarrage automatique sur Linux non implémentée');
  }
}