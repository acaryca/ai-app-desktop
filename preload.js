// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected APIs to web pages
contextBridge.exposeInMainWorld('electron', {
  // Functions to communicate with the main process
  sendMessage: (channel, data) => ipcRenderer.send(channel, data),
  receiveMessage: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
    return () => ipcRenderer.removeListener(channel, func);
  }
});

// Expose electronAPI for specific functionalities
contextBridge.exposeInMainWorld('electronAPI', {
  // Function to open a URL in the default browser
  openInBrowser: (url) => ipcRenderer.send('open-in-browser', url),
  // Function to move the window
  startWindowDrag: () => ipcRenderer.send('window-drag'),
  // Functions for i18n
  setLanguage: (lang) => ipcRenderer.send('set-language', lang),
  getCurrentLanguage: () => ipcRenderer.invoke('get-current-language'),
  getAvailableLanguages: () => ipcRenderer.invoke('get-available-languages')
});

// This ensures that the context menu works correctly
window.addEventListener('contextmenu', (e) => {
  // Check if right-click is on an image
  if (e.target.tagName === 'IMG') {
    
    // Prevent default right-click behavior
    e.preventDefault();
    
    // Send the image URL to the main process
    ipcRenderer.send('image-context-menu', {
      srcUrl: e.target.src,
      x: e.clientX,
      y: e.clientY
    });
  }
});

// CSS injection function
function injectGlobalCSS() {
  const css = `
    #acary-drag-handle {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 12px;
      background-color: transparent;
      z-index: 2147483647;
      -webkit-app-region: drag;
      cursor: grab;
      transition: background-color 0.2s ease;
    }
  `;
  
  const style = document.createElement('style');
  style.id = 'acary-drag-style';
  style.textContent = css;
  document.head.appendChild(style);
}

// Add drag zone after document loading
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, adding drag zone');
  
  // Inject global styles
  injectGlobalCSS();
  
  // Create element for drag zone
  const dragZone = document.createElement('div');
  dragZone.id = 'acary-drag-handle';
  
  // Add drag zone to the beginning of body
  document.body.insertBefore(dragZone, document.body.firstChild);
  
  // Ensure the zone stays in the foreground and always exists
  setTimeout(() => {
    // Check if styles are still present
    if (!document.getElementById('acary-drag-style')) {
      injectGlobalCSS();
    }
    
    // Check if drag zone still exists
    if (!document.getElementById('acary-drag-handle')) {
      document.body.insertBefore(dragZone, document.body.firstChild);
    }
  }, 500);
  
  // Listen for messages from the main process
  ipcRenderer.on('window-drag-started', () => {
    console.log('Window drag started');
  });
}); 