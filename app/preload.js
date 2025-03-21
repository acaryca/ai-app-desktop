// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Constantes de configuration
const CONFIG = {
  DRAG_HANDLE_ID: 'acary-drag-handle',
  DRAG_STYLE_ID: 'acary-drag-style',
  RETRY_DELAY: 500
};

// CSS pour la zone de drag
const DRAG_HANDLE_CSS = `
  #${CONFIG.DRAG_HANDLE_ID} {
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

// Exposer des API protégées aux pages web
contextBridge.exposeInMainWorld('electron', {
  // Fonctions pour communiquer avec le processus principal
  sendMessage: (channel, data) => {
    if (typeof channel !== 'string') return;
    ipcRenderer.send(channel, data);
  },
  receiveMessage: (channel, func) => {
    if (typeof channel !== 'string' || typeof func !== 'function') return;
    
    // Créer une fonction wrapper pour la sécurité
    const subscription = (event, ...args) => func(...args);
    ipcRenderer.on(channel, subscription);
    
    // Retourner une fonction pour annuler l'abonnement
    return () => ipcRenderer.removeListener(channel, subscription);
  }
});

// Exposer l'API electronAPI pour les fonctionnalités spécifiques
contextBridge.exposeInMainWorld('electronAPI', {
  // Fonction pour ouvrir une URL dans le navigateur par défaut
  openInBrowser: (url) => {
    if (typeof url !== 'string') return;
    ipcRenderer.send('open-in-browser', url);
  },
  // Fonction pour déplacer la fenêtre
  startWindowDrag: () => ipcRenderer.send('window-drag'),
  // Écouter les événements de mise à jour
  onUpdateProgress: (callback) => {
    if (typeof callback !== 'function') return;
    const subscription = (_, data) => callback(data);
    ipcRenderer.on('update-progress', subscription);
    return () => ipcRenderer.removeListener('update-progress', subscription);
  },
  onUpdateDownloaded: (callback) => {
    if (typeof callback !== 'function') return;
    const subscription = (_, data) => callback(data);
    ipcRenderer.on('update-complete', subscription);
    return () => ipcRenderer.removeListener('update-complete', subscription);
  },
  // Ajouter un nouvel abonnement pour les téléchargements terminés
  onDownloadComplete: (callback) => {
    if (typeof callback !== 'function') return;
    const subscription = (_, data) => callback(data);
    ipcRenderer.on('download-complete', subscription);
    return () => ipcRenderer.removeListener('download-complete', subscription);
  }
});

// Fonction d'injection CSS
function injectGlobalCSS() {
  // Vérifier si le style existe déjà
  if (document.getElementById(CONFIG.DRAG_STYLE_ID)) return;
  
  const style = document.createElement('style');
  style.id = CONFIG.DRAG_STYLE_ID;
  style.textContent = DRAG_HANDLE_CSS;
  document.head.appendChild(style);
}

// Fonction pour créer et ajouter la zone de drag
function createDragHandle() {
  // Vérifier si la poignée existe déjà
  if (document.getElementById(CONFIG.DRAG_HANDLE_ID)) return;
  
  // Créer l'élément pour la zone de drag
  const dragZone = document.createElement('div');
  dragZone.id = CONFIG.DRAG_HANDLE_ID;
  
  // Ajouter la zone de drag au début du body
  document.body.insertBefore(dragZone, document.body.firstChild);
}

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

// Fonction pour s'assurer que les éléments UI d'Electron sont présents
function ensureUIElements() {
  injectGlobalCSS();
  createDragHandle();
}

// Ajouter la zone de drag après le chargement du document
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM chargé, initialisation de l\'interface Electron');
  
  // Configuration initiale
  ensureUIElements();
  
  // Configurer la vérification périodique pour les éléments UI
  const uiCheckInterval = setInterval(() => {
    ensureUIElements();
  }, CONFIG.RETRY_DELAY);
  
  // Nettoyer l'intervalle après un certain temps (optionnel)
  setTimeout(() => {
    clearInterval(uiCheckInterval);
    console.log('Arrêt des vérifications périodiques des éléments UI');
  }, 10000); // Arrêter après 10 secondes
  
  // Écouter les messages du processus principal
  ipcRenderer.on('window-drag-started', () => {
    console.log('Déplacement de fenêtre commencé');
  });
}); 