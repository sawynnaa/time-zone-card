import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  getTimezoneCityDisplayName,
  getTimezoneDisplayLabel,
  getIanaRegion,
  resolveCountryIso,
  localizeIsoCountry,
  ISO_TO_I18N_COUNTRY_KEY,
  IANA_REGION_KEYS,
} from '@/utils/timezone-locale'

/**
 * 城市 / 国家 / 时区显示名 — 严格跟随当前 UI 语言
 */
export function useCityTranslation() {
  const { t, te, locale } = useI18n()

  /** 保证模板对 locale 的依赖可追踪 */
  const currentLocale = computed(() => String(locale.value))

  /**
   * 城市名称
   */
  function getCityName(cityId: string, _fallback?: string, timezone?: string): string {
    // 依赖 locale，切换语言时强制重算
    const loc = currentLocale.value
    const key = `cities.${cityId}`

    if (te(key))
      return t(key)

    if (timezone)
      return getTimezoneCityDisplayName(timezone, loc)

    return cityId
      .replace(/^(africa|america|antarctica|arctic|asia|atlantic|australia|europe|indian|pacific|etc)-/i, '')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  /**
   * 国家 / 地区名称（严格本地化）
   * country 为空（如世界协调时）时返回空字符串
   */
  function getCountryName(country: string, timezone?: string): string {
    const loc = currentLocale.value

    // 显式空国家（UTC 等无国家条目）
    if (!(country || '').trim())
      return ''

    // 1) ISO → i18n 特殊词条或 DisplayNames
    const iso = resolveCountryIso(country, timezone)
    if (iso) {
      const i18nKey = ISO_TO_I18N_COUNTRY_KEY[iso]
      if (i18nKey) {
        const key = `countries.${i18nKey}`
        if (te(key))
          return t(key)
      }

      const localized = localizeIsoCountry(iso, loc)
      if (localized)
        return localized
    }

    // 2) IANA 大区 → regions.*
    const regionName = (country && IANA_REGION_KEYS[country])
      ? country
      : (timezone ? getIanaRegion(timezone) : undefined)

    if (regionName) {
      const regionKey = IANA_REGION_KEYS[regionName]
      if (regionKey) {
        const key = `regions.${regionKey}`
        if (te(key))
          return t(key)
      }
    }

    // 3) 已是 i18n 国家键
    if (country) {
      const key = `countries.${country.toLowerCase()}`
      if (te(key))
        return t(key)
    }

    return t('card.unknownCountry')
  }

  /**
   * 时区本地化名称（非 IANA 技术 ID）
   * 例：America/New_York → 纽约 / New York / ニューヨーク
   */
  function getTimezoneLabel(timezone: string): string {
    return getTimezoneDisplayLabel(timezone, currentLocale.value)
  }

  return {
    getCityName,
    getCountryName,
    getTimezoneLabel,
    currentLocale,
  }
}
