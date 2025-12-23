import { ref, watch } from 'vue'
import { SUPPORTED_LOCALES, type LocaleCode } from '@/i18n'

// 全局状态（单例模式）
const currentLocale = ref<LocaleCode>('zh-CN')

// --- 本地存储持久化 ---
const STORAGE_KEY = 'vue-timezone:locale:v1'
let persistenceInitialized = false
let restoringFromStorage = false
let persistQueued = false

interface PersistedLocaleStateV1 {
  version: 1
  locale: string
}

// SSR/无痕/禁用存储等场景下，localStorage 可能不可用
function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

// 校验并清洗持久化数据
function sanitizePersistedState(raw: unknown): PersistedLocaleStateV1 | null {
  if (!raw || typeof raw !== 'object')
    return null

  const record = raw as Record<string, unknown>
  if (record.version !== 1)
    return null

  const locale = record.locale
  if (typeof locale !== 'string')
    return null

  // 验证是否为支持的语言
  if (!(locale in SUPPORTED_LOCALES))
    return null

  return {
    version: 1,
    locale,
  }
}

// 尝试从 localStorage 恢复
function restoreFromStorage(): boolean {
  if (!canUseStorage())
    return false

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw)
    return false

  try {
    const parsed = JSON.parse(raw) as unknown
    const sanitized = sanitizePersistedState(parsed)
    if (!sanitized)
      return false

    restoringFromStorage = true
    currentLocale.value = sanitized.locale as LocaleCode
    return true
  }
  catch {
    return false
  }
  finally {
    restoringFromStorage = false
  }
}

// 写入 localStorage
function persistToStorage() {
  if (restoringFromStorage)
    return
  if (!canUseStorage())
    return

  const state: PersistedLocaleStateV1 = {
    version: 1,
    locale: currentLocale.value,
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }
  catch {
    // ignore quota / privacy mode errors
  }
}

// 合并短时间内多次状态变化
function schedulePersist() {
  if (restoringFromStorage || persistQueued)
    return
  persistQueued = true

  const queue = typeof queueMicrotask === 'function'
    ? queueMicrotask
    : (fn: () => void) => Promise.resolve().then(fn)

  queue(() => {
    persistQueued = false
    persistToStorage()
  })
}

function setupPersistence() {
  if (persistenceInitialized)
    return
  persistenceInitialized = true

  watch(currentLocale, schedulePersist, { flush: 'sync' })
}

// 检测浏览器语言
function detectBrowserLanguage(): LocaleCode {
  if (typeof navigator === 'undefined')
    return 'zh-CN'

  const browserLang = navigator.language || (navigator as any).userLanguage
  if (!browserLang)
    return 'zh-CN'

  // 尝试精确匹配
  if (browserLang in SUPPORTED_LOCALES)
    return browserLang as LocaleCode

  // 尝试匹配语言代码（不包含地区）
  const langCode = browserLang.split('-')[0]
  const matchedLocale = Object.keys(SUPPORTED_LOCALES).find(
    locale => locale.split('-')[0] === langCode,
  )

  return (matchedLocale as LocaleCode) || 'zh-CN'
}

/**
 * 语言状态管理 Composable
 */
export function useLocale() {
  setupPersistence()

  // 初始化：从 localStorage 恢复或使用浏览器语言
  if (!restoringFromStorage && currentLocale.value === 'zh-CN') {
    const restored = restoreFromStorage()
    if (!restored) {
      // 如果没有保存的语言偏好，使用浏览器语言
      currentLocale.value = detectBrowserLanguage()
    }
  }

  // 设置语言
  function setLocale(locale: LocaleCode) {
    if (locale in SUPPORTED_LOCALES) {
      currentLocale.value = locale
    }
  }

  return {
    currentLocale,
    setLocale,
    availableLocales: SUPPORTED_LOCALES,
  }
}
