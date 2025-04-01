/**
 * Internationalization module
 */
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Import language files
const en = require('./en');
const fr = require('./fr');

// Available languages
const languages = {
  en,
  fr
};

// Get system locale
function getSystemLocale() {
  // Get locale from electron app
  const locale = app.getLocale() || 'en';
  return locale.split('-')[0].toLowerCase(); // Extract the language code
}

// Check if file exists in user data path
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (err) {
    return false;
  }
}

// Get user preference from store if available
function getUserLocale(store) {
  if (store && store.has('language')) {
    return store.get('language');
  }
  return null;
}

// Choose language based on user preference or system locale
function getLanguage(store) {
  // Try to get user preference
  const userLocale = getUserLocale(store);
  if (userLocale && languages[userLocale]) {
    return userLocale;
  }
  
  // Otherwise use system locale
  const systemLocale = getSystemLocale();
  return languages[systemLocale] ? systemLocale : 'en'; // Default to English
}

class I18n {
  constructor(store) {
    this.store = store;
    this.currentLang = getLanguage(store);
    this.translations = languages[this.currentLang] || languages['en'];
  }
  
  // Get a translation key
  t(key, params = {}) {
    const keys = key.split('.');
    let result = this.translations;
    
    // Navigate through the keys
    for (const k of keys) {
      if (result && result[k] !== undefined) {
        result = result[k];
      } else {
        // Key not found, try English as fallback
        result = this._fallbackTranslation(key);
        break;
      }
    }
    
    // If result is a string, replace parameters
    if (typeof result === 'string') {
      return this._replaceParams(result, params);
    }
    
    return result || key; // Return key if no translation found
  }
  
  // Try to get translation from fallback language (English)
  _fallbackTranslation(key) {
    if (this.currentLang === 'en') return undefined;
    
    const keys = key.split('.');
    let result = languages['en'];
    
    for (const k of keys) {
      if (result && result[k] !== undefined) {
        result = result[k];
      } else {
        return undefined;
      }
    }
    
    return result;
  }
  
  // Replace parameters in translation string
  _replaceParams(text, params) {
    return Object.keys(params).reduce((result, key) => {
      return result.replace(new RegExp(`{${key}}`, 'g'), params[key]);
    }, text);
  }
  
  // Change current language
  setLanguage(lang) {
    if (languages[lang]) {
      this.currentLang = lang;
      this.translations = languages[lang];
      
      // Save to store if available
      if (this.store) {
        this.store.set('language', lang);
      }
      
      return true;
    }
    return false;
  }
  
  // Get current language
  getLanguage() {
    return this.currentLang;
  }
  
  // Get all available languages
  getAvailableLanguages() {
    return Object.keys(languages);
  }
}

module.exports = { I18n }; 