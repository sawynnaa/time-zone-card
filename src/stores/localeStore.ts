import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { SUPPORTED_LOCALES, type LocaleCode } from '@/i18n'

export const useLocaleStore = defineStore('locale', () => {
  // ============ State ============
  const currentLocale = ref<LocaleCode>('zh-CN')

  // ============ Getters ============
  const availableLocales = computed(() => SUPPORTED_LOCALES)

  // ============ Actions ============
  function detectBrowserLanguage(): LocaleCode {
    if (typeof navigator === 'undefined')
      return 'zh-CN'

    const browserLang = navigator.language || (navigator as any).userLanguage
    if (!browserLang)
      return 'zh-CN'

    // Exact match
    if (browserLang in SUPPORTED_LOCALES) {
      return browserLang as LocaleCode
    }

    // Match language code only
    const langCode = browserLang.split('-')[0]
    const matchedLocale = Object.keys(SUPPORTED_LOCALES).find(
      locale => locale.split('-')[0] === langCode,
    )

    return (matchedLocale as LocaleCode) || 'zh-CN'
  }

  function setLocale(locale: LocaleCode) {
    if (locale in SUPPORTED_LOCALES) {
      currentLocale.value = locale
    }
  }

  // Initialize with browser language if not restored from storage
  function initializeLocale() {
    // If we're still at default and no persisted value was loaded,
    // detect browser language
    if (currentLocale.value === 'zh-CN') {
      // Check if localStorage has a value already
      const stored = localStorage.getItem('vue-timezone:locale:v1')
      if (!stored) {
        currentLocale.value = detectBrowserLanguage()
      }
    }
  }

  return {
    // State
    currentLocale,

    // Getters
    availableLocales,

    // Actions
    setLocale,
    detectBrowserLanguage,
    initializeLocale,
  }
}, {
  persist: {
    key: 'vue-timezone:locale:v1',
    storage: localStorage,
    serializer: {
      deserialize: (value: string) => {
        try {
          const parsed = JSON.parse(value)

          // Validate version
          if (parsed.version !== 1)
            return {}

          // Validate locale
          if (typeof parsed.locale !== 'string')
            return {}
          if (!(parsed.locale in SUPPORTED_LOCALES))
            return {}

          return {
            currentLocale: parsed.locale,
          }
        }
        catch {
          return {}
        }
      },
      serialize: (state: any) => {
        const persistedState = {
          version: 1,
          locale: state.currentLocale,
        }
        return JSON.stringify(persistedState)
      },
    },
  },
})
