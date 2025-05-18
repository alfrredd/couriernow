import AsyncStorage from '@react-native-async-storage/async-storage';
import en from '../../translations/en.json';
import es from '../../translations/es.json';

interface TranslationOptions {
  [key: string]: any;
}

interface TranslationFunction {
  (key: string, options?: TranslationOptions): string;
}

// Create a simple translation service
const translations: { [key: string]: any } = {
  en,
  es
};

let currentLocale = 'en';

// Load initial language from AsyncStorage
const loadLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem('language');
    if (savedLanguage && translations[savedLanguage]) {
      currentLocale = savedLanguage;
    }
  } catch (error) {
    console.error('Error loading language:', error);
  }
};

// Load language when service is imported
loadLanguage();

// Get current locale
export const getCurrentLocale = (): string => {
  return currentLocale;
};

// Change language
export const setLanguage = async (language: string): Promise<void> => {
  if (translations[language]) {
    currentLocale = language;
    await AsyncStorage.setItem('language', language);
  }
};

// Export the translation function
export const t: TranslationFunction = (key: string, options?: TranslationOptions): string => {
  // Split key into namespace and actual key
  const [namespace, ...path] = key.split('.');
  let translation = translations[currentLocale]?.[namespace];
  
  // Traverse the path
  if (translation) {
    for (const segment of path) {
      translation = translation[segment];
      if (!translation) break;
    }
  }
  
  // If translation not found, try fallback to English
  if (!translation) {
    translation = translations['en']?.[namespace];
    if (translation) {
      for (const segment of path) {
        translation = translation[segment];
        if (!translation) break;
      }
    }
  }
  
  // If still no translation, return key
  if (!translation) {
    return key;
  }
  
  // Handle options (pluralization, interpolation, etc.)
  if (options) {
    // Simple interpolation
    if (typeof translation === 'string') {
      let result = translation;
      Object.entries(options).forEach(([key, value]) => {
        result = result.replace(new RegExp(`{${key}}`, 'g'), value);
      });
      return result;
    }
  }
  
  return typeof translation === 'string' ? translation : key;
};

// Export supported languages
export const SUPPORTED_LANGUAGES = {
  en: 'English',
  es: 'Español'
};