import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import ar from './locales/ar.json'
import de from './locales/de.json'
import en from './locales/en.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import tr from './locales/tr.json'

export const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English', nativeLabel: 'English', dir: 'ltr' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', dir: 'rtl' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch', dir: 'ltr' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', dir: 'ltr' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', dir: 'ltr' },
  { code: 'tr', label: 'Turkish', nativeLabel: 'Türkçe', dir: 'ltr' },
]

export function dirFor(code) {
  return LANGUAGE_OPTIONS.find((l) => l.code === code)?.dir || 'ltr'
}

function applyDocumentDirection(code) {
  document.documentElement.lang = code
  document.documentElement.dir = dirFor(code)
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
      de: { translation: de },
      es: { translation: es },
      fr: { translation: fr },
      tr: { translation: tr },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ar', 'de', 'es', 'fr', 'tr'],
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'lp_language',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  })

applyDocumentDirection(i18n.resolvedLanguage || 'en')
i18n.on('languageChanged', applyDocumentDirection)

export default i18n
