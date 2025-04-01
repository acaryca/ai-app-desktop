const { app, BrowserWindow, Tray, Menu, screen, MenuItem, ipcMain, shell, dialog, globalShortcut } = require('electron');
const path = require('path');
const options = require('./options'); // Import options module
const { autoUpdater } = require('electron-updater');
const { I18n } = require('./i18n'); // Import i18n module

// Set application name
app.name = 'AI';

// Global declarations
let mainWindow = null;
let tray = null;
let isQuitting = false;
let isAlwaysOnTop = true; // Default value, will be updated after loading the store
let animationsEnabled = false; // Default value, will be updated after loading the store
let openAtStartup = true; // Default value, will be updated after loading the store
let i18n = null; // Will be initialized after loading the store

// Application configuration and initialization
async function init() {
  try {
    // Dynamically import electron-store
    const { default: Store } = await import('electron-store');
    
    // Configure persistent storage
    const store = new Store({
      defaults: options.STORE_DEFAULTS
    });
    
    // Initialize i18n
    i18n = new I18n(store);
    
    // Set up IPC handlers for i18n
    setupI18nHandlers(store);
    
    // Load saved settings
    isAlwaysOnTop = store.get('isAlwaysOnTop');
    animationsEnabled = store.get('animationsEnabled');
    openAtStartup = store.get('openAtStartup');
    options.ANIMATIONS.enabled = animationsEnabled;
    
    // Configure automatic startup
    setAutoLaunch(openAtStartup);
    
    // Create user interface
    createTray(store);
    createWindow(store);
    
    // Configure menu according to platform
    configureMenu();
    
    // Configure platform-specific events
    configurePlatformSpecifics();
    
    // Configure window drag handling
    setupWindowDrag();
    
    // Configure keyboard shortcuts
    setupShortcuts();
    
    // Configure automatic updates
    setupAutoUpdater();
  } catch (error) {
    console.error(i18n ? i18n.t('logs.initError') : 'Error during initialization:', error);
  }
}

// Function to configure window drag
function setupWindowDrag() {
  // Event to start window dragging
  ipcMain.on('window-drag', () => {
    if (mainWindow) {
      // Send an event to the window to indicate drag has started
      mainWindow.webContents.send('window-drag-started');
    }
  });
  
  // Add event handler to open links in default browser
  ipcMain.on('open-in-browser', (event, url) => {
    shell.openExternal(url);
  });
}

// Functions for fade effects
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
      window.setOpacity(1); // Reset opacity for next opening
      if (callback) callback();
    }
  }, options.ANIMATIONS.fadeInterval);
}

function createWindow(store) {
  // Create the browser window
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  // Get saved size before calculating position
  const savedSize = store.get('windowSize');
  const windowWidth = savedSize.width || options.DEFAULT_WINDOW_SIZE.width;
  const windowHeight = savedSize.height || options.DEFAULT_WINDOW_SIZE.height;
  
  // Define window position
  let windowPosition = {};
  
  // Get saved position or set a default one
  const savedPosition = store.get('windowPosition');
  
  if (savedPosition && savedPosition.x !== undefined && savedPosition.y !== undefined && 
      savedPosition.x > 0 && savedPosition.y > 0) {
    // Use saved position only if it seems valid
    windowPosition = savedPosition;
    console.log(i18n.t('logs.usingPosition'), windowPosition);
  } else {
    // Calculate position at bottom right with 10px margin
    windowPosition = {
      x: width - windowWidth - 10,
      y: height - windowHeight - 10
    };
    console.log(i18n.t('logs.newPosition'), windowPosition);
    
    // Save this default position
    store.set('windowPosition', windowPosition);
  }
  
  // Create window with calculated parameters
  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: windowPosition.x,
    y: windowPosition.y,
    alwaysOnTop: isAlwaysOnTop,
    ...options.WINDOW_CONFIG
  });

  // Force position after window creation to ensure it's correct
  mainWindow.setPosition(windowPosition.x, windowPosition.y);
  
  // Load URL
  mainWindow.loadURL(options.APP_URL);

  // Add fade effect when displaying the window
  mainWindow.once('ready-to-show', () => {
    // Check position one last time before displaying
    mainWindow.setPosition(windowPosition.x, windowPosition.y);
    openWindowWithEffect(mainWindow);
  });

  // Save window position and size when moved or resized
  mainWindow.on('moved', () => {
    const bounds = mainWindow.getBounds();
    const newPosition = { x: bounds.x, y: bounds.y };
    console.log('Position updated after move:', newPosition);
    store.set('windowPosition', newPosition);
  });
  
  mainWindow.on('resized', () => {
    const bounds = mainWindow.getBounds();
    store.set('windowSize', { width: bounds.width, height: bounds.height });
  });

  // Create a context menu for right click
  const contextMenu = Menu.buildFromTemplate(options.getContextMenuTemplate(i18n));

  // Add event for right click
  mainWindow.webContents.on('context-menu', (e, params) => {
    contextMenu.popup({ window: mainWindow, x: params.x, y: params.y });
  });

  // Handle image-specific context menu
  ipcMain.on('image-context-menu', (event, data) => {
    // Create a menu template for images
    const imageMenuTemplate = options.getImageMenuTemplate(data, i18n);
    
    // Replace the 'download-image' action with the actual function
    const downloadImageItem = imageMenuTemplate.find(item => item.click === 'download-image');
    if (downloadImageItem) {
      downloadImageItem.click = async () => {
        // Ask the user where to save the image
        const parsedUrl = new URL(data.srcUrl);
        const filename = path.basename(parsedUrl.pathname) || 'image.png';
        
        const saveOptions = options.getSaveImageOptions(app, filename, i18n);
        
        try {
          const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, saveOptions);
          
          if (!canceled && filePath) {
            // Download the image
            downloadImage(data.srcUrl, filePath);
          }
        } catch (error) {
          console.error('Error with save dialog:', error);
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

  // Emitted when the window is closed
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
  // Use appropriate icon according to platform and screen resolution
  const iconPath = options.getIconPath();
  
  // Create taskbar icon
  tray = new Tray(iconPath);
  
  // Get menu template
  let menuTemplate = options.getTrayMenuTemplate(isAlwaysOnTop, animationsEnabled, openAtStartup, i18n);
  
  // Replace generic actions with specific functions
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
        // Reset dimensions
        mainWindow.setSize(options.DEFAULT_WINDOW_SIZE.width, options.DEFAULT_WINDOW_SIZE.height);
        
        // Calculate position at bottom right
        const { width, height } = screen.getPrimaryDisplay().workAreaSize;
        const newPosition = {
          x: width - options.DEFAULT_WINDOW_SIZE.width - 10,
          y: height - options.DEFAULT_WINDOW_SIZE.height - 10
        };
        
        // Apply new position
        mainWindow.setPosition(newPosition.x, newPosition.y);
        
        // Save reset settings
        store.set('windowSize', options.DEFAULT_WINDOW_SIZE);
        store.set('windowPosition', newPosition);
        
        console.log(i18n.t('logs.windowReset'), options.DEFAULT_WINDOW_SIZE, i18n.t('logs.position'), newPosition);
      }
    },
    'check-updates': () => {
      // Check for updates manually (with message if no update)
      checkForUpdates(true);
    },
    'quit-app': () => {
      isQuitting = true;
      app.quit();
    }
  };

  // Handle language switch
  i18n.getAvailableLanguages().forEach(lang => {
    actionHandlers[`set-language-${lang}`] = () => {
      if (i18n.setLanguage(lang)) {
        // Refresh UI after language change
        recreateMenu(store);
      }
    };
  });
  
  // Replace actions with actual functions
  menuTemplate = menuTemplate.map(item => {
    if (item.click && typeof item.click === 'string' && actionHandlers[item.click]) {
      return { ...item, click: actionHandlers[item.click] };
    } else if (item.submenu) {
      // Process submenu items
      item.submenu = item.submenu.map(subItem => {
        if (subItem.click && typeof subItem.click === 'string' && actionHandlers[subItem.click]) {
          return { ...subItem, click: actionHandlers[subItem.click] };
        }
        return subItem;
      });
    }
    return item;
  });
  
  // Add macOS-specific options
  if (process.platform === 'darwin') {
    // Insert additional elements after "Reset Window" option
    const macExtras = options.getMacTrayExtras(i18n);
    menuTemplate.splice(4, 0, ...macExtras);
  }
  
  const contextMenu = Menu.buildFromTemplate(menuTemplate);
  tray.setToolTip(i18n.t('tray.tooltip'));
  tray.setContextMenu(contextMenu);
  
  // Click on icon to open the application
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

// Function to refresh the UI after language change
function recreateMenu(store) {
  if (tray) {
    // Define action handlers (same as in createTray)
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
          // Reset dimensions
          mainWindow.setSize(options.DEFAULT_WINDOW_SIZE.width, options.DEFAULT_WINDOW_SIZE.height);
          
          // Calculate position at bottom right
          const { width, height } = screen.getPrimaryDisplay().workAreaSize;
          const newPosition = {
            x: width - options.DEFAULT_WINDOW_SIZE.width - 10,
            y: height - options.DEFAULT_WINDOW_SIZE.height - 10
          };
          
          // Apply new position
          mainWindow.setPosition(newPosition.x, newPosition.y);
          
          // Save reset settings
          store.set('windowSize', options.DEFAULT_WINDOW_SIZE);
          store.set('windowPosition', newPosition);
          
          console.log(i18n.t('logs.windowReset'), options.DEFAULT_WINDOW_SIZE, i18n.t('logs.position'), newPosition);
        }
      },
      'check-updates': () => {
        // Check for updates manually (with message if no update)
        checkForUpdates(true);
      },
      'quit-app': () => {
        isQuitting = true;
        app.quit();
      }
    };

    // Handle language switch
    i18n.getAvailableLanguages().forEach(lang => {
      actionHandlers[`set-language-${lang}`] = () => {
        if (i18n.setLanguage(lang)) {
          // Refresh UI after language change
          recreateMenu(store);
        }
      };
    });

    // Get menu template and map actions to functions
    let menuTemplate = options.getTrayMenuTemplate(isAlwaysOnTop, animationsEnabled, openAtStartup, i18n);
    
    // Replace actions with actual functions
    menuTemplate = menuTemplate.map(item => {
      if (item.click && typeof item.click === 'string' && actionHandlers[item.click]) {
        return { ...item, click: actionHandlers[item.click] };
      } else if (item.submenu) {
        // Process submenu items
        item.submenu = item.submenu.map(subItem => {
          if (subItem.click && typeof subItem.click === 'string' && actionHandlers[subItem.click]) {
            return { ...subItem, click: actionHandlers[subItem.click] };
          }
          return subItem;
        });
      }
      return item;
    });
    
    // Add macOS-specific options
    if (process.platform === 'darwin') {
      // Insert additional elements after "Reset Window" option
      const macExtras = options.getMacTrayExtras(i18n);
      menuTemplate.splice(4, 0, ...macExtras);
    }
    
    const contextMenu = Menu.buildFromTemplate(menuTemplate);
    tray.setToolTip(i18n.t('tray.tooltip'));
    tray.setContextMenu(contextMenu);
  }
  
  // Recreate window context menu if window exists
  if (mainWindow) {
    const contextMenu = Menu.buildFromTemplate(options.getContextMenuTemplate(i18n));
    mainWindow.webContents.removeAllListeners('context-menu');
    mainWindow.webContents.on('context-menu', (e, params) => {
      contextMenu.popup({ window: mainWindow, x: params.x, y: params.y });
    });
  }
  
  // Update application menu
  configureMenu();
}

function configureMenu() {
  // Create application menu for macOS
  if (process.platform === 'darwin') {
    const menu = Menu.buildFromTemplate(options.getMacMenuTemplate(app, i18n));
    Menu.setApplicationMenu(menu);
  } else {
    // On Windows and Linux, we can hide the menu
    Menu.setApplicationMenu(null);
  }
}

function configurePlatformSpecifics() {
  // macOS specific configuration
  if (process.platform === 'darwin') {
    // Hide dock icon by default (application in tray mode only)
    app.dock.hide();
    
    // Show dock icon when window is visible
    app.on('browser-window-created', () => {
      if (!app.dock.isVisible()) {
        app.dock.show();
      }
    });
    
    // Hide dock icon when all windows are closed
    app.on('window-all-closed', () => {
      if (app.dock.isVisible()) {
        app.dock.hide();
      }
    });
  }
}

// Function to configure keyboard shortcuts
function setupShortcuts() {
  let lastReloadTime = 0;
  const RELOAD_COOLDOWN = 500;

  // CTRL+R shortcut to reload the page
  globalShortcut.register('CommandOrControl+R', () => {
    if (mainWindow) {
      const currentTime = Date.now();
      if (currentTime - lastReloadTime >= RELOAD_COOLDOWN) {
        mainWindow.webContents.reload();
        lastReloadTime = currentTime;
        console.log(i18n.t('logs.pageReloaded'));
      }
    }
  });
  
  // Make sure shortcuts are released when the application closes
  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });
}

// Function to download an image
function downloadImage(imageUrl, filePath) {
  const protocol = imageUrl.startsWith('https:') ? require('https') : require('http');
  const fs = require('fs');
  
  const file = fs.createWriteStream(filePath);
  
  protocol.get(imageUrl, (response) => {
    // Check if the response is a redirect
    if (response.statusCode === 301 || response.statusCode === 302) {
      // Follow the redirect
      downloadImage(response.headers.location, filePath);
      return;
    }
    
    // Pipe the data stream to the file
    response.pipe(file);
    
    file.on('finish', () => {
      file.close();
      // Notify the user that the download is complete
      if (mainWindow) {
        mainWindow.webContents.send('download-complete', {
          success: true,
          filePath: filePath
        });
      }
    });
  }).on('error', (err) => {
    fs.unlink(filePath, () => {}); // Delete file in case of error
    if (mainWindow) {
      mainWindow.webContents.send('download-complete', {
        success: false,
        error: err.message
      });
    }
  });
}

// Application events

// This method will be called when Electron has finished initializing
app.whenReady().then(() => {
  init();
  
  app.on('activate', () => {
    // On macOS, it's common to re-create a window when
    // the dock icon is clicked and there are no other open windows.
    if (BrowserWindow.getAllWindows().length === 0) {
      init();
    }
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Proper handling of application closure
app.on('before-quit', () => {
  isQuitting = true;
});

// Function to configure automatic startup
function setAutoLaunch(enable) {
  // Different depending on platform
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
    // On Linux, we should create a .desktop file
    // This might require privileges or using an external package
    console.log(i18n.t('logs.linuxAutostart'));
  }
}

// Automatic update configuration
function setupAutoUpdater() {
  // Configure the update server (GitHub by default)
  autoUpdater.logger = require('electron-log');
  autoUpdater.logger.transports.file.level = 'info';
  
  // Disable automatic download by default
  autoUpdater.autoDownload = false;
  
  // Fix download URL if needed
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'acaryca',
    repo: 'ai-app-tray',
    releaseType: 'release'
  });
  
  // Update events
  autoUpdater.on('checking-for-update', () => {
    console.log(i18n.t('logs.checking'));
  });
  
  autoUpdater.on('update-available', (info) => {
    console.log(i18n.t('logs.updateAvailable'), info);
    showUpdateNotification(info);
  });
  
  autoUpdater.on('update-not-available', (info) => {
    console.log(i18n.t('logs.noUpdateAvailable'), info);
    dialog.showMessageBox({
      title: i18n.t('dialog.update.title'),
      message: i18n.t('dialog.update.noUpdates'),
      buttons: ['OK']
    });
  });
  
  autoUpdater.on('error', (err) => {
    console.error(i18n.t('logs.updateError'), err);
    dialog.showErrorBox(
      i18n.t('dialog.update.error'), 
      i18n.t('dialog.update.errorMessage', { message: err.message })
    );
  });
  
  autoUpdater.on('download-progress', (progressObj) => {
    let message = i18n.t('logs.downloadProgress', {
      speed: progressObj.bytesPerSecond,
      percent: progressObj.percent
    });
    console.log(message);
    // We could add a progress bar here
  });
  
  autoUpdater.on('update-downloaded', (info) => {
    console.log(i18n.t('logs.updateDownloaded'), info);
    // Offer to install now
    dialog.showMessageBox({
      title: i18n.t('dialog.update.downloaded'),
      message: i18n.t('dialog.update.readyToInstall'),
      buttons: [i18n.t('dialog.update.restart'), i18n.t('dialog.update.later')]
    }).then((returnValue) => {
      if (returnValue.response === 0) {
        isQuitting = true;
        autoUpdater.quitAndInstall();
      }
    });
  });
  
  // Check for updates automatically at startup (after a delay)
  setTimeout(() => {
    checkForUpdates(false);
  }, 5000); // Wait 5 seconds after startup
}

// Check for updates
function checkForUpdates(showNoUpdateMessage = true) {
  // Save previous value
  const previousAutoDownload = autoUpdater.autoDownload;
  
  // If showNoUpdateMessage is false, avoid showing message if no update is available
  if (!showNoUpdateMessage) {
    autoUpdater.removeAllListeners('update-not-available');
    autoUpdater.on('update-not-available', (info) => {
      console.log('No update available (silent)', info);
    });
  }
  
  // Keep autoDownload false to not automatically download
  autoUpdater.autoDownload = false;
  
  try {
    autoUpdater.checkForUpdates();
  } catch (error) {
    console.error('Error during update check:', error);
    if (showNoUpdateMessage) {
      dialog.showErrorBox(
        'Update Error', 
        `An error occurred while checking for updates: ${error.message}`
      );
    }
  }
  
  // Restore event listeners if necessary
  if (!showNoUpdateMessage) {
    setTimeout(() => {
      // Remove silent listener
      autoUpdater.removeAllListeners('update-not-available');
      
      // Restore standard listener
      autoUpdater.on('update-not-available', (info) => {
        console.log('No update available', info);
        if (showNoUpdateMessage) {
          dialog.showMessageBox({
            title: 'Update',
            message: 'You are using the latest version of the application.',
            buttons: ['OK']
          });
        }
      });
    }, 1000);
  }
  
  // Restore previous autoDownload value
  autoUpdater.autoDownload = previousAutoDownload;
}

// Display update notification
function showUpdateNotification(info) {
  const dialogOpts = {
    type: 'info',
    buttons: [i18n.t('dialog.update.download'), i18n.t('dialog.update.later')],
    title: i18n.t('dialog.update.available'),
    message: i18n.t('dialog.update.newVersion', { version: info.version }),
    detail: i18n.t('dialog.update.downloadQuestion')
  };
  
  dialog.showMessageBox(dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) {
      // User chose to download, start downloading
      autoUpdater.downloadUpdate();
    }
  });
}

// Function to set up IPC handlers for i18n functionality
function setupI18nHandlers(store) {
  // Handle language change from renderer
  ipcMain.on('set-language', (event, lang) => {
    if (i18n.setLanguage(lang)) {
      // Refresh UI after language change
      recreateMenu(store);
    }
  });
  
  // Handle get current language
  ipcMain.handle('get-current-language', () => {
    return i18n.getLanguage();
  });
  
  // Handle get available languages
  ipcMain.handle('get-available-languages', () => {
    return i18n.getAvailableLanguages();
  });
}