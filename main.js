const { app, BrowserWindow, Tray, Menu, screen, MenuItem, ipcMain, shell, dialog, globalShortcut } = require('electron');
const path = require('path');
const options = require('./options'); // Importer le module options
const { autoUpdater } = require('electron-updater');

// Définir le nom de l'application
app.name = 'AI';

// Déclarations globales
let mainWindow = null;
let tray = null;
let isQuitting = false;
let isAlwaysOnTop = true; // Valeur par défaut, sera mise à jour après le chargement du store
let animationsEnabled = false; // Valeur par défaut, sera mise à jour après le chargement du store
let openAtStartup = true; // Valeur par défaut, sera mise à jour après le chargement du store

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
    isAlwaysOnTop = store.get('isAlwaysOnTop');
    animationsEnabled = store.get('animationsEnabled');
    openAtStartup = store.get('openAtStartup');
    options.ANIMATIONS.enabled = animationsEnabled;
    
    // Configurer le démarrage automatique
    setAutoLaunch(openAtStartup);
    
    // Créer l'interface utilisateur
    createTray(store);
    createWindow(store);
    
    // Configurer le menu selon la plateforme
    configureMenu();
    
    // Configurer les événements spécifiques à la plateforme
    configurePlatformSpecifics();
    
    // Configurer la gestion du déplacement de la fenêtre
    setupWindowDrag();
    
    // Configurer les raccourcis clavier
    setupShortcuts();
    
    // Configurer les mises à jour automatiques
    setupAutoUpdater();
  } catch (error) {
    console.error('Erreur lors de l\'initialisation:', error);
  }
}

// Fonction pour configurer le déplacement de la fenêtre
function setupWindowDrag() {
  // Événement pour démarrer le déplacement de la fenêtre
  ipcMain.on('window-drag', () => {
    if (mainWindow) {
      // Envoyer un événement à la fenêtre pour indiquer que le drag a commencé
      mainWindow.webContents.send('window-drag-started');
    }
  });
  
  // Ajouter un gestionnaire d'événements pour ouvrir les liens dans le navigateur par défaut
  ipcMain.on('open-in-browser', (event, url) => {
    shell.openExternal(url);
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
  
  // Définir la position de la fenêtre
  let windowPosition = {};
  
  // Récupérer la position enregistrée ou en définir une par défaut
  const savedPosition = store.get('windowPosition');
  
  if (savedPosition && savedPosition.x !== undefined && savedPosition.y !== undefined && 
      savedPosition.x > 0 && savedPosition.y > 0) {
    // Utiliser la position sauvegardée seulement si elle semble valide
    windowPosition = savedPosition;
    console.log('Utilisation de la position sauvegardée:', windowPosition);
  } else {
    // Calculer la position en bas à droite avec une marge de 10px
    windowPosition = {
      x: width - windowWidth - 10,
      y: height - windowHeight - 10
    };
    console.log('Nouvelle position calculée en bas à droite:', windowPosition);
    
    // Enregistrer cette position par défaut
    store.set('windowPosition', windowPosition);
  }
  
  // Créer la fenêtre avec les paramètres calculés
  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: windowPosition.x,
    y: windowPosition.y,
    alwaysOnTop: isAlwaysOnTop,
    ...options.WINDOW_CONFIG
  });

  // Forcer la position après la création de la fenêtre pour s'assurer qu'elle est correcte
  mainWindow.setPosition(windowPosition.x, windowPosition.y);
  
  // Charger l'URL
  mainWindow.loadURL(options.APP_URL);

  // Ajouter un effet de fondu lors de l'affichage de la fenêtre
  mainWindow.once('ready-to-show', () => {
    // Vérifier une dernière fois la position avant d'afficher
    mainWindow.setPosition(windowPosition.x, windowPosition.y);
    openWindowWithEffect(mainWindow);
  });

  // Sauvegarder la position et la taille de la fenêtre lorsqu'elle est déplacée ou redimensionnée
  mainWindow.on('moved', () => {
    const bounds = mainWindow.getBounds();
    const newPosition = { x: bounds.x, y: bounds.y };
    console.log('Position mise à jour après déplacement:', newPosition);
    store.set('windowPosition', newPosition);
  });
  
  mainWindow.on('resized', () => {
    const bounds = mainWindow.getBounds();
    store.set('windowSize', { width: bounds.width, height: bounds.height });
  });

  // Créer un menu contextuel pour le clic droit
  const contextMenu = Menu.buildFromTemplate(options.CONTEXT_MENU_TEMPLATE);

  // Ajouter l'événement pour le clic droit
  mainWindow.webContents.on('context-menu', (e, params) => {
    contextMenu.popup({ window: mainWindow, x: params.x, y: params.y });
  });

  // Gérer le menu contextuel spécifique aux images
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
          const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, saveOptions);
          
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
      window: mainWindow, 
      x: data.x, 
      y: data.y 
    });
  });

  // Émis lorsque la fenêtre est fermée
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      closeWindowWithEffect(mainWindow);
      return false;
    }
    return true;
  });
}

function createTray(store) {
  // Utiliser l'icône appropriée selon la plateforme et la résolution d'écran
  const iconPath = options.getIconPath();
  
  // Créer l'icône de la barre des tâches
  tray = new Tray(iconPath);
  
  // Obtenir le template du menu
  let menuTemplate = options.getTrayMenuTemplate(isAlwaysOnTop, animationsEnabled, openAtStartup);
  
  // Remplacer les actions génériques par des fonctions spécifiques
  const actionHandlers = {
    'open-window': () => {
      if (mainWindow === null) {
        createWindow(store);
      } else {
        openWindowWithEffect(mainWindow);
      }
    },
    'toggle-always-on-top': () => {
      isAlwaysOnTop = !isAlwaysOnTop;
      if (mainWindow) {
        mainWindow.setAlwaysOnTop(isAlwaysOnTop);
      }
      store.set('isAlwaysOnTop', isAlwaysOnTop);
    },
    'toggle-animations': () => {
      animationsEnabled = !animationsEnabled;
      options.ANIMATIONS.enabled = animationsEnabled;
      store.set('animationsEnabled', animationsEnabled);
    },
    'toggle-startup': () => {
      openAtStartup = !openAtStartup;
      setAutoLaunch(openAtStartup);
      store.set('openAtStartup', openAtStartup);
    },
    'reset-window': () => {
      if (mainWindow) {
        // Réinitialiser les dimensions
        mainWindow.setSize(options.DEFAULT_WINDOW_SIZE.width, options.DEFAULT_WINDOW_SIZE.height);
        
        // Calculer la position en bas à droite
        const { width, height } = screen.getPrimaryDisplay().workAreaSize;
        const newPosition = {
          x: width - options.DEFAULT_WINDOW_SIZE.width - 10,
          y: height - options.DEFAULT_WINDOW_SIZE.height - 10
        };
        
        // Appliquer la nouvelle position
        mainWindow.setPosition(newPosition.x, newPosition.y);
        
        // Sauvegarder les paramètres réinitialisés
        store.set('windowSize', options.DEFAULT_WINDOW_SIZE);
        store.set('windowPosition', newPosition);
        
        console.log('Fenêtre réinitialisée - Dimensions:', options.DEFAULT_WINDOW_SIZE, 'Position:', newPosition);
      }
    },
    'check-updates': () => {
      // Vérifier les mises à jour manuellement (avec message si pas de mise à jour)
      checkForUpdates(true);
    },
    'quit-app': () => {
      isQuitting = true;
      app.quit();
    }
  };
  
  // Remplacer les actions par les fonctions réelles
  menuTemplate = menuTemplate.map(item => {
    if (item.click && typeof item.click === 'string' && actionHandlers[item.click]) {
      return { ...item, click: actionHandlers[item.click] };
    }
    return item;
  });
  
  // Ajouter des options spécifiques à macOS
  if (process.platform === 'darwin') {
    // Insérer les éléments supplémentaires après l'option "Réinitialiser la fenêtre"
    menuTemplate.splice(4, 0, ...options.MAC_TRAY_EXTRAS);
  }
  
  const contextMenu = Menu.buildFromTemplate(menuTemplate);
  tray.setToolTip('AI');
  tray.setContextMenu(contextMenu);
  
  // Clic sur l'icône pour ouvrir l'application
  tray.on('click', () => {
    if (mainWindow === null) {
      createWindow(store);
    } else {
      if (mainWindow.isVisible()) {
        closeWindowWithEffect(mainWindow);
      } else {
        openWindowWithEffect(mainWindow);
      }
    }
  });
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

// Fonction pour configurer les raccourcis clavier
function setupShortcuts() {
  let lastReloadTime = 0;
  const RELOAD_COOLDOWN = 500;

  // Raccourci CTRL+R pour recharger la page
  globalShortcut.register('CommandOrControl+R', () => {
    if (mainWindow) {
      const currentTime = Date.now();
      if (currentTime - lastReloadTime >= RELOAD_COOLDOWN) {
        mainWindow.webContents.reload();
        lastReloadTime = currentTime;
        console.log('Page rechargée avec CTRL+R');
      }
    }
  });
  
  // S'assurer que les raccourcis sont libérés quand l'application se ferme
  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });
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
      if (mainWindow) {
        mainWindow.webContents.send('download-complete', {
          success: true,
          filePath: filePath
        });
      }
    });
  }).on('error', (err) => {
    fs.unlink(filePath, () => {}); // Supprimer le fichier en cas d'erreur
    if (mainWindow) {
      mainWindow.webContents.send('download-complete', {
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
  isQuitting = true;
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

// Configuration de la mise à jour automatique
function setupAutoUpdater() {
  // Configurer le serveur de mise à jour (GitHub par défaut)
  autoUpdater.logger = require('electron-log');
  autoUpdater.logger.transports.file.level = 'info';
  
  // Événements de mise à jour
  autoUpdater.on('checking-for-update', () => {
    console.log('Vérification des mises à jour...');
  });
  
  autoUpdater.on('update-available', (info) => {
    console.log('Mise à jour disponible:', info);
    showUpdateNotification(info);
  });
  
  autoUpdater.on('update-not-available', (info) => {
    console.log('Aucune mise à jour disponible', info);
    dialog.showMessageBox({
      title: 'Mise à jour',
      message: 'Vous utilisez la dernière version de l\'application.',
      buttons: ['OK']
    });
  });
  
  autoUpdater.on('error', (err) => {
    console.error('Erreur lors de la mise à jour:', err);
    dialog.showErrorBox(
      'Erreur de mise à jour', 
      `Une erreur s'est produite lors de la vérification des mises à jour: ${err.message}`
    );
  });
  
  autoUpdater.on('download-progress', (progressObj) => {
    let message = `Vitesse: ${progressObj.bytesPerSecond} - Téléchargé ${progressObj.percent}%`;
    console.log(message);
    // On pourrait ajouter une barre de progression ici
  });
  
  autoUpdater.on('update-downloaded', (info) => {
    console.log('Mise à jour téléchargée:', info);
    // Proposer d'installer maintenant
    dialog.showMessageBox({
      title: 'Installation de la mise à jour',
      message: 'La mise à jour a été téléchargée. Voulez-vous redémarrer l\'application pour l\'installer ?',
      buttons: ['Redémarrer', 'Plus tard']
    }).then((returnValue) => {
      if (returnValue.response === 0) {
        isQuitting = true;
        autoUpdater.quitAndInstall();
      }
    });
  });
  
  // Vérifier les mises à jour automatiquement au démarrage (après un délai)
  setTimeout(() => {
    checkForUpdates(false);
  }, 5000); // Attendre 5 secondes après le démarrage
}

// Vérifier les mises à jour
function checkForUpdates(showNoUpdateMessage = true) {
  // Sauvegarder la valeur précédente
  const previousShowNoUpdateMessage = autoUpdater.autoDownload;
  
  // Si showNoUpdateMessage est false, éviter de montrer le message si aucune mise à jour n'est disponible
  if (!showNoUpdateMessage) {
    autoUpdater.removeAllListeners('update-not-available');
    autoUpdater.on('update-not-available', (info) => {
      console.log('Aucune mise à jour disponible (silencieux)', info);
    });
  }
  
  // Définir autoDownload à true pour télécharger automatiquement les mises à jour
  autoUpdater.autoDownload = true;
  
  try {
    autoUpdater.checkForUpdatesAndNotify();
  } catch (error) {
    console.error('Erreur lors de la vérification des mises à jour:', error);
    if (showNoUpdateMessage) {
      dialog.showErrorBox(
        'Erreur de mise à jour', 
        `Une erreur s'est produite lors de la vérification des mises à jour: ${error.message}`
      );
    }
  }
  
  // Rétablir les écouteurs d'événements si nécessaire
  if (!showNoUpdateMessage) {
    setTimeout(() => {
      // Supprimer l'écouteur silencieux
      autoUpdater.removeAllListeners('update-not-available');
      
      // Rétablir l'écouteur standard
      autoUpdater.on('update-not-available', (info) => {
        console.log('Aucune mise à jour disponible', info);
        if (showNoUpdateMessage) {
          dialog.showMessageBox({
            title: 'Mise à jour',
            message: 'Vous utilisez la dernière version de l\'application.',
            buttons: ['OK']
          });
        }
      });
    }, 1000);
  }
}

// Afficher une notification de mise à jour disponible
function showUpdateNotification(info) {
  const dialogOpts = {
    type: 'info',
    buttons: ['Télécharger', 'Plus tard'],
    title: 'Mise à jour disponible',
    message: `Une nouvelle version (${info.version}) est disponible.`,
    detail: 'Une nouvelle version est prête à être téléchargée. Voulez-vous la télécharger maintenant ?'
  };
  
  dialog.showMessageBox(dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) {
      // L'utilisateur a choisi de télécharger, nous laissons l'autoUpdater continuer
    }
  });
}