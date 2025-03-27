// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Exposer des API protégées aux pages web
contextBridge.exposeInMainWorld('electron', {
  // Fonctions pour communiquer avec le processus principal
  sendMessage: (channel, data) => ipcRenderer.send(channel, data),
  receiveMessage: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
    return () => ipcRenderer.removeListener(channel, func);
  }
});

// Exposer l'API electronAPI pour les fonctionnalités spécifiques
contextBridge.exposeInMainWorld('electronAPI', {
  // Fonction pour ouvrir une URL dans le navigateur par défaut
  openInBrowser: (url) => ipcRenderer.send('open-in-browser', url),
  // Fonction pour déplacer la fenêtre
  startWindowDrag: () => ipcRenderer.send('window-drag')
});

// Ceci permet de s'assurer que le menu contextuel fonctionne correctement
window.addEventListener('contextmenu', (e) => {
  // Vérifier si le clic droit est sur une image
  if (e.target.tagName === 'IMG') {
    
    // Empêcher le comportement par défaut du clic droit
    e.preventDefault();
    
    // Envoyer l'URL de l'image au processus principal
    ipcRenderer.send('image-context-menu', {
      srcUrl: e.target.src,
      x: e.clientX,
      y: e.clientY
    });
  }
});

// Fonction d'injection CSS
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

// Ajouter la zone de drag après le chargement du document
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM chargé, ajout de la zone de drag');
  
  // Injecter les styles globaux
  injectGlobalCSS();
  
  // Créer l'élément pour la zone de drag
  const dragZone = document.createElement('div');
  dragZone.id = 'acary-drag-handle';
  
  // Ajouter la zone de drag au début du body
  document.body.insertBefore(dragZone, document.body.firstChild);
  
  // S'assurer que la zone reste au premier plan et existe toujours
  setTimeout(() => {
    // Vérifier si les styles sont toujours présents
    if (!document.getElementById('acary-drag-style')) {
      injectGlobalCSS();
    }
    
    // Vérifier si la zone de drag existe encore
    if (!document.getElementById('acary-drag-handle')) {
      document.body.insertBefore(dragZone, document.body.firstChild);
    }
  }, 500);
  
  // Écouter les messages du processus principal
  ipcRenderer.on('window-drag-started', () => {
    console.log('Déplacement de fenêtre commencé');
  });
}); 