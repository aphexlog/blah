import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';
import frTranslations from './locales/fr.json';

const resources = {
  en: {
    translation: enTranslations,
  },
  es: {
    translation: esTranslations,
  },
  fr: {
    translation: frTranslations,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    
    interpolation: {
      escapeValue: false, // React already handles escaping
    },
    
    // Development options
    debug: import.meta.env.NODE_ENV === 'development',
    
    // Namespace and key handling
    defaultNS: 'translation',
    keySeparator: '.',
    nsSeparator: ':',
    
    // React options
    react: {
      useSuspense: false,
    },
  });

export default i18n;