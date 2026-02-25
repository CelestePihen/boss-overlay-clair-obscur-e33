import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react'

import de from './locales/de.json'
import en from './locales/en.json'
import fr from './locales/fr.json'

export type Language = 'fr' | 'en' | 'de'

type TranslationObject = typeof fr

const translations: Record<Language, TranslationObject> = {
  fr,
  en,
  de,
}

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
  translateZone: (zoneName: string) => string
  translateCategory: (category: string) => string
  translateBossName: (bossName: string) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

// Détecte la langue du système
const detectSystemLanguage = (): Language => {
  const systemLang = navigator.language.toLowerCase()
  if (systemLang.startsWith('fr')) return 'fr'
  if (systemLang.startsWith('de')) return 'de'
  return 'en' // Par défaut
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Charger la langue depuis la config
    if (window.electronAPI) {
      return 'fr' // Temporaire, sera mis à jour par useEffect
    }
    return detectSystemLanguage()
  })

  // Charger la langue au démarrage
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getConfig().then((config) => {
        if (config.language) {
          setLanguageState(config.language as Language)
        } else {
          // Première utilisation : détecter et sauvegarder la langue système
          const detectedLang = detectSystemLanguage()
          setLanguageState(detectedLang)
          window.electronAPI.saveConfig({ ...config, language: detectedLang })
        }
      })
    }
  }, [])

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang)
    if (window.electronAPI) {
      const config = await window.electronAPI.getConfig()
      await window.electronAPI.saveConfig({ ...config, language: lang })
    }
  }

  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.')
    let value: unknown = translations[language]

    for (const k of keys) {
      if (typeof value === 'object' && value !== null) {
        value = (value as Record<string, unknown>)[k]
      }
      if (value === undefined) {
        console.warn(`Translation key not found: ${key}`)
        return key
      }
    }

    if (typeof value !== 'string') {
      console.warn(`Translation value is not a string: ${key}`)
      return key
    }

    // Remplacer les paramètres
    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => {
        return params[paramKey]?.toString() ?? `{{${paramKey}}}`
      })
    }

    return value
  }

  const translateZone = (zoneName: string): string => {
    return t(`zones.${zoneName}`) !== `zones.${zoneName}`
      ? t(`zones.${zoneName}`)
      : zoneName
  }

  const translateCategory = (category: string): string => {
    return t(`categories.${category}`) !== `categories.${category}`
      ? t(`categories.${category}`)
      : category
  }

  const translateBossName = (bossName: string): string => {
    return t(`bossNames.${bossName}`) !== `bossNames.${bossName}`
      ? t(`bossNames.${bossName}`)
      : bossName
  }

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        t,
        translateZone,
        translateCategory,
        translateBossName,
      }}
    >
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}
