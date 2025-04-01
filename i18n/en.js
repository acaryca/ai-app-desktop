/**
 * English translations
 */
module.exports = {
  app: {
    name: 'AI Chat',
  },
  tray: {
    tooltip: 'AI Chat',
    open: 'Open',
    checkUpdates: 'Check for Updates',
    alwaysOnTop: 'Always on Top',
    animations: 'Animations',
    launchAtStartup: 'Launch at Startup',
    resetWindow: 'Reset Window',
    quit: 'Quit',
    services: 'Services'
  },
  context: {
    copy: 'Copy',
    paste: 'Paste',
    selectAll: 'Select All',
    downloadImage: 'Download Image',
    copyImageUrl: 'Copy Image URL'
  },
  menu: {
    edit: 'Edit',
  },
  dialog: {
    update: {
      title: 'Update',
      noUpdates: 'You are using the latest version of the application.',
      available: 'Update Available',
      newVersion: 'A new version ({version}) is available.',
      downloadQuestion: 'A new version is ready to be downloaded. Do you want to download it now?',
      downloaded: 'Install Update',
      readyToInstall: 'The update has been downloaded. Do you want to restart the application to install it?',
      download: 'Download',
      restart: 'Restart',
      later: 'Later',
      error: 'Update Error',
      errorMessage: 'An error occurred while checking for updates: {message}'
    },
    save: {
      title: 'Save Image',
      images: 'Images',
      allFiles: 'All Files'
    }
  },
  logs: {
    initError: 'Error during initialization:',
    checking: 'Checking for updates...',
    updateAvailable: 'Update available:',
    noUpdateAvailable: 'No update available',
    noUpdateSilent: 'No update available (silent)',
    updateError: 'Error during update check:',
    windowReset: 'Window reset - Dimensions:',
    position: 'Position:',
    usingPosition: 'Using saved position:',
    newPosition: 'New position calculated at bottom right:',
    positionUpdated: 'Position updated after move:',
    pageReloaded: 'Page reloaded with CTRL+R',
    linuxAutostart: 'Automatic startup configuration on Linux not implemented',
    updateDownloaded: 'Update downloaded:',
    downloadProgress: 'Speed: {speed} - Downloaded {percent}%',
    updateConfigSaved: 'Update configuration saved for correct file naming'
  }
};