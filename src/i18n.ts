import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// The translations
// (tip: move them in a JSON file and import them,
// or even better, manage them separated from your code: https://react.i18next.com/guides/multiple-translation-files)
const resources = {
  en: {
    translation: {
      "nav": {
        "properties": "Properties",
        "invest": "Invest",
        "dashboard": "Dashboard",
        "login": "Login",
        "admin": "Admin"
      },
      "hero": {
        "title": "Your Trusted Global Real Estate Partner",
        "subtitle": "Discover luxury homes, secure property investments, and transparent property management worldwide.",
        "search": "Search properties, locations..."
      }
    }
  },
  es: {
    translation: {
      "nav": {
        "properties": "Propiedades",
        "invest": "Invertir",
        "dashboard": "Panel",
        "login": "Acceso",
        "admin": "Admin"
      },
      "hero": {
        "title": "Su socio inmobiliario global de confianza",
        "subtitle": "Descubra casas de lujo, inversiones inmobiliarias seguras y gestión de propiedades en todo el mundo.",
        "search": "Buscar propiedades, ubicaciones..."
      }
    }
  },
  fr: {
    translation: {
      "nav": {
        "properties": "Propriétés",
        "invest": "Investir",
        "dashboard": "Tableau de bord",
        "login": "Connexion",
        "admin": "Admin"
      },
      "hero": {
        "title": "Votre partenaire immobilier mondial de confiance",
        "subtitle": "Découvrez des maisons de luxe, des investissements immobiliers sécurisés et une gestion transparente.",
        "search": "Rechercher des propriétés, lieux..."
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    }
  });

export default i18n;
