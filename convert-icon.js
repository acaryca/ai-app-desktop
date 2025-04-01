const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIco = require('png-to-ico');

// Path to SVG file
const svgPath = path.join(__dirname, 'assets', 'icon.svg');
// Output directory
const outputDir = path.join(__dirname, 'assets');

// Icon sizes to generate (in pixels)
const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];

// Function to create directory if it doesn't exist
function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

// Function to convert SVG to PNG with different sizes
async function convertSvgToPng() {
  try {
    // Create output directory if it doesn't exist
    ensureDirectoryExists(outputDir);
    
    const pngPaths = [];
    
    // Generate PNGs for each size
    for (const size of sizes) {
      const pngPath = path.join(outputDir, `icon-${size}.png`);
      
      // Convert SVG to PNG with sharp
      await sharp(svgPath)
        .resize(size, size)
        .toFile(pngPath);
      
      console.log(`SVG to PNG conversion (${size}x${size}) successful!`);
      
      // Add file path to the list for ICO file creation (only sizes up to 256)
      if (size <= 256) {
        pngPaths.push(pngPath);
      }
    }
    
    // Create ICO file from PNGs for Windows
    try {
      const icoBuffer = await pngToIco(pngPaths);
      const icoPath = path.join(outputDir, 'icon.ico');
      
      // Write the ICO file
      fs.writeFileSync(icoPath, icoBuffer);
      console.log('ICO file creation successful!');
    } catch (err) {
      console.error('Error creating ICO file:', err);
    }
    
    // Copy the 32x32 size file as main icon for system tray
    fs.copyFileSync(
      path.join(outputDir, 'icon-32.png'),
      path.join(outputDir, 'icon.png')
    );
    console.log('Main icon for system tray created!');
    
    // Copy the 256x256 size file as main icon for Linux
    fs.copyFileSync(
      path.join(outputDir, 'icon-256.png'),
      path.join(outputDir, 'icon.png')
    );
    console.log('Main icon for Linux created (256x256)!');
    
    // Create a template icon for macOS (black and transparent)
    try {
      // Read the original SVG and modify it to be monochrome
      let svgContent = fs.readFileSync(svgPath, 'utf8');
      
      // Replace colors with black
      svgContent = svgContent.replace(/<path[^>]*fill="[^"]*"[^>]*>/g, (match) => {
        return match.replace(/fill="[^"]*"/g, 'fill="black"');
      });
      
      // Write the SVG template
      const templateSvgPath = path.join(outputDir, 'icon-template.svg');
      fs.writeFileSync(templateSvgPath, svgContent);
      
      // Convert template SVG to PNG with sharp
      await sharp(templateSvgPath)
        .resize(32, 32)
        .toFile(path.join(outputDir, 'icon-template.png'));
      
      console.log('Template icon for macOS created!');
    } catch (err) {
      console.error('Error creating template icon:', err);
    }
    
    // Create a 1024x1024 PNG file for macOS (will be converted to ICNS in GitHub Actions workflow)
    try {
      // Copy the 1024x1024 PNG as base for macOS icon
      fs.copyFileSync(
        path.join(outputDir, 'icon-1024.png'),
        path.join(outputDir, 'icon-mac.png')
      );
      console.log('Base icon for macOS created!');
    } catch (err) {
      console.error('Error creating macOS icon:', err);
    }
    
  } catch (err) {
    console.error('Error during conversion:', err);
  }
}

// Run the conversion
convertSvgToPng(); 