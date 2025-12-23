// @unocss-include
import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN'
import en from './locales/en'
import ja from './locales/ja'
import ko from './locales/ko'
import de from './locales/de'
import fr from './locales/fr'
import es from './locales/es'
import it from './locales/it'
import pt from './locales/pt'
import zhCNCities from './cities/zh-CN'
import enCities from './cities/en'
import jaCities from './cities/ja'
import koCities from './cities/ko'
import deCities from './cities/de'
import frCities from './cities/fr'
import esCities from './cities/es'
import itCities from './cities/it'
import ptCities from './cities/pt'

// 支持的语言配置
export const SUPPORTED_LOCALES = {
  'zh-CN': {
    code: 'zh-CN',
    name: '简体中文',
    flag: 'i-twemoji-flag-china',
    shortCode: '中文',
  },
  'en': {
    code: 'en',
    name: 'English',
    flag: 'i-twemoji-flag-united-states',
    shortCode: 'EN',
  },
  'ja': {
    code: 'ja',
    name: '日本語',
    flag: 'i-twemoji-flag-japan',
    shortCode: '日',
  },
  'ko': {
    code: 'ko',
    name: '한국어',
    flag: 'i-twemoji-flag-south-korea',
    shortCode: '한',
  },
  'de': {
    code: 'de',
    name: 'Deutsch',
    flag: 'i-twemoji-flag-germany',
    shortCode: 'DE',
  },
  'fr': {
    code: 'fr',
    name: 'Français',
    flag: 'i-twemoji-flag-france',
    shortCode: 'FR',
  },
  'es': {
    code: 'es',
    name: 'Español',
    flag: 'i-twemoji-flag-spain',
    shortCode: 'ES',
  },
  'it': {
    code: 'it',
    name: 'Italiano',
    flag: 'i-twemoji-flag-italy',
    shortCode: 'IT',
  },
  'pt': {
    code: 'pt',
    name: 'Português',
    flag: 'i-twemoji-flag-portugal',
    shortCode: 'PT',
  },
} as const

export type LocaleCode = keyof typeof SUPPORTED_LOCALES

// 合并 UI 翻译和城市翻译
function mergeMessages(uiMessages: any, cityMessages: any) {
  return {
    ...uiMessages,
    ...cityMessages,
  }
}

/**
 * 设置 i18n 实例
 */
export function setupI18n() {
  const i18n = createI18n({
    legacy: false, // 使用 Composition API 模式
    locale: 'zh-CN', // 默认语言
    fallbackLocale: {
      'ja': ['en', 'zh-CN'],
      'ko': ['en', 'zh-CN'],
      'de': ['en', 'zh-CN'],
      'fr': ['en', 'zh-CN'],
      'es': ['en', 'zh-CN'],
      'it': ['en', 'zh-CN'],
      'pt': ['en', 'zh-CN'],
      'default': ['en', 'zh-CN'],
    },
    messages: {
      'zh-CN': mergeMessages(zhCN, zhCNCities),
      'en': mergeMessages(en, enCities),
      'ja': mergeMessages(ja, jaCities),
      'ko': mergeMessages(ko, koCities),
      'de': mergeMessages(de, deCities),
      'fr': mergeMessages(fr, frCities),
      'es': mergeMessages(es, esCities),
      'it': mergeMessages(it, itCities),
      'pt': mergeMessages(pt, ptCities),
    },
    missingWarn: import.meta.env.DEV, // 开发模式显示缺失翻译警告
    fallbackWarn: false,
  })

  return i18n
}
