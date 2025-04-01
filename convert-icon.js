const fs = require('fs');
const path = require('path');
const svg2png = require('svg2png');
const pngToIco = require('png-to-ico');

// Chemin vers le fichier SVG
const svgPath = path.join(__dirname, 'assets', 'icon.svg');
// Dossier de sortie
const outputDir = path.join(__dirname, 'assets');

// Tailles d'icônes à générer (en pixels)
const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];

// Fonction pour créer le dossier s'il n'existe pas
function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

// Fonction pour convertir SVG en PNG avec différentes tailles
async function convertSvgToPng() {
  try {
    // Lire le fichier SVG
    const svgData = fs.readFileSync(svgPath);
    const pngBuffers = [];
    const pngPaths = [];
    
    // Créer le dossier de sortie s'il n'existe pas
    ensureDirectoryExists(outputDir);
    
    // Générer les PNG pour chaque taille
    for (const size of sizes) {
      const pngBuffer = await svg2png(svgData, { width: size, height: size });
      const pngPath = path.join(outputDir, `icon-${size}.png`);
      
      // Écrire le fichier PNG
      fs.writeFileSync(pngPath, pngBuffer);
      console.log(`Conversion SVG en PNG (${size}x${size}) réussie!`);
      
      // Ajouter le chemin du fichier à la liste pour la création du fichier ICO (seulement les tailles jusqu'à 256)
      if (size <= 256) {
        pngPaths.push(pngPath);
      }
    }
    
    // Créer le fichier ICO à partir des PNG pour Windows
    try {
      const icoBuffer = await pngToIco(pngPaths);
      const icoPath = path.join(outputDir, 'icon.ico');
      
      // Écrire le fichier ICO
      fs.writeFileSync(icoPath, icoBuffer);
      console.log('Création du fichier ICO réussie!');
    } catch (err) {
      console.error('Erreur lors de la création du fichier ICO:', err);
    }
    
    // Copier le fichier de taille 32x32 comme icône principale pour le system tray
    fs.copyFileSync(
      path.join(outputDir, 'icon-32.png'),
      path.join(outputDir, 'icon.png')
    );
    console.log('Icône principale pour le system tray créée!');
    
    // Copier le fichier de taille 256x256 comme icône principale pour Linux
    fs.copyFileSync(
      path.join(outputDir, 'icon-256.png'),
      path.join(outputDir, 'icon.png')
    );
    console.log('Icône principale pour Linux créée (256x256)!');
    
    // Créer une icône template pour macOS (noir et transparent)
    try {
      const templateSvgPath = path.join(outputDir, 'icon-template.svg');
      
      // Lire le SVG original et le modifier pour le rendre monochrome
      let svgContent = fs.readFileSync(svgPath, 'utf8');
      
      // Remplacer les couleurs par du noir
      svgContent = svgContent.replace(/<path[^>]*fill="[^"]*"[^>]*>/g, (match) => {
        return match.replace(/fill="[^"]*"/g, 'fill="black"');
      });
      
      // Écrire le SVG template
      fs.writeFileSync(templateSvgPath, svgContent);
      
      // Convertir le SVG template en PNG
      const templatePngBuffer = await svg2png(fs.readFileSync(templateSvgPath), { width: 32, height: 32 });
      fs.writeFileSync(path.join(outputDir, 'icon-template.png'), templatePngBuffer);
      console.log('Icône template pour macOS créée!');
    } catch (err) {
      console.error('Erreur lors de la création de l\'icône template:', err);
    }
    
    // Créer un fichier PNG de 1024x1024 pour macOS (sera converti en ICNS dans le workflow GitHub Actions)
    try {
      // Copier le PNG de 1024x1024 comme base pour l'icône macOS
      fs.copyFileSync(
        path.join(outputDir, 'icon-1024.png'),
        path.join(outputDir, 'icon-mac.png')
      );
      console.log('Icône de base pour macOS créée!');
    } catch (err) {
      console.error('Erreur lors de la création de l\'icône macOS:', err);
    }
    
  } catch (err) {
    console.error('Erreur lors de la conversion:', err);
  }
}

// Exécuter la conversion
convertSvgToPng(); 