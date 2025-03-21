const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const svgIconTray = path.join(__dirname, 'icon-tray.svg');
const svgIconApp = path.join(__dirname, 'icon-app.svg');

// Dossier de sortie
const outputDir = path.join(__dirname, '..', '..', 'app');
const iconsDir = path.join(outputDir, 'icons');

// Tailles d'icônes à générer (en pixels)
const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
const traySizes = [16, 24, 32];

// Fonction pour créer le dossier s'il n'existe pas
function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

// Fonction pour convertir SVG en PNG avec différentes tailles
async function convertAppIcon() {
  try {
    // Créer les dossiers de sortie s'ils n'existent pas
    ensureDirectoryExists(outputDir);
    ensureDirectoryExists(iconsDir);
    
    // Générer les PNG pour chaque taille de l'icône de l'application
    for (const size of sizes) {
      await sharp(svgIconApp)
        .resize(size, size)
        .png()
        .toFile(path.join(iconsDir, `icon-${size}.png`));
      console.log(`Conversion de l'icône app en PNG (${size}x${size}) réussie!`);
    }
    
    // Créer le fichier ICO pour Windows
    await sharp(svgIconApp)
      .resize(256, 256)
      .toFile(path.join(iconsDir, 'icon.ico'));
    console.log('Création du fichier icon.ico réussie!');
    
    // Créer le fichier ICNS pour macOS (si sur macOS avec iconutil)
    // Cette partie nécessiterait des outils supplémentaires sur macOS
    
    console.log('Génération des icônes de l\'application terminée!');
  } catch (err) {
    console.error('Erreur lors de la conversion des icônes de l\'application:', err);
  }
}

// Fonction pour convertir l'icône de la barre des tâches
async function convertTrayIcon() {
  try {
    ensureDirectoryExists(iconsDir);
    
    // Générer les PNG pour chaque taille de l'icône de la barre des tâches
    for (const size of traySizes) {
      await sharp(svgIconTray)
        .resize(size, size)
        .png()
        .toFile(path.join(iconsDir, `tray-icon-${size}.png`));
      console.log(`Conversion de l'icône tray en PNG (${size}x${size}) réussie!`);
    }
    
    // Créer le fichier ICO pour la barre des tâches Windows
    await sharp(svgIconTray)
      .resize(32, 32)
      .toFile(path.join(iconsDir, 'tray-icon.ico'));
    console.log('Création du fichier tray-icon.ico réussie!');
    
    // Créer une version template pour macOS (fond transparent avec contenu noir)
    await sharp(svgIconTray)
      .resize(24, 24)
      .toFile(path.join(iconsDir, 'tray-icon-Template.png'));
    console.log('Création de l\'icône template pour macOS réussie!');
    
    console.log('Génération des icônes de la barre des tâches terminée!');
  } catch (err) {
    console.error('Erreur lors de la conversion des icônes de la barre des tâches:', err);
  }
}

// Fonction principale
async function generateIcons() {
  try {
    await convertAppIcon();
    await convertTrayIcon();
    console.log('Génération de toutes les icônes terminée avec succès!');
  } catch (err) {
    console.error('Erreur lors de la génération des icônes:', err);
  }
}

// Exécuter la génération
generateIcons(); 