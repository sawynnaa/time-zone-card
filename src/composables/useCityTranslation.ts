import { useI18n } from 'vue-i18n'
import {
  getTimezoneCityDisplayName,
  getIanaRegion,
  resolveCountryIso,
  localizeIsoCountry,
  ISO_TO_I18N_COUNTRY_KEY,
  IANA_REGION_KEYS,
} from '@/utils/timezone-locale'

/**
 * 城市和国家名称翻译 Composable
 * - 常用城市：优先 i18n 词条
 * - 国家/地区：优先按 ISO 用 Intl.DisplayNames 跟随当前语言
 * - 其余 IANA 时区城市：用 Intl 按当前语言生成显示名
 * - 绝不直接展示数据里的中文硬编码或未翻译英文
 */
export function useCityTranslation() {
  const { t, te, locale } = useI18n()

  /**
   * 获取城市名称（跟随当前 UI 语言）
   */
  function getCityName(cityId: string, _fallback?: string, timezone?: string): string {
    const key = `cities.${cityId}`
    if (te(key))
      return t(key)

    // 无显式词条时，用 Intl 按当前 UI 语言生成本地化名称
    if (timezone)
      return getTimezoneCityDisplayName(timezone, String(locale.value))

    // 最后回退：格式化 id（避免使用可能是中文的 fallback）
    return cityId
      .replace(/^(africa|america|antarctica|arctic|asia|atlantic|australia|europe|indian|pacific|etc)-/i, '')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  /**
   * 获取国家/地区名称（严格跟随当前 UI 语言）
   * @param country 数据中的国家字段（ISO / 遗留中文 / i18n 键 / IANA 区域）
   * @param timezone 可选 IANA 时区，用于更准确的国家解析
   */
  function getCountryName(country: string, timezone?: string): string {
    const currentLocale = String(locale.value)

    // 1) 解析 ISO，用 i18n 特殊词条或 DisplayNames
    const iso = resolveCountryIso(country, timezone)
    if (iso) {
      // 特殊文案（如台湾 → 中国台湾）优先走项目 i18n
      const i18nKey = ISO_TO_I18N_COUNTRY_KEY[iso]
      if (i18nKey) {
        const key = `countries.${i18nKey}`
        if (te(key))
          return t(key)
      }

      const localized = localizeIsoCountry(iso, currentLocale)
      if (localized)
        return localized
    }

    // 2) IANA 大区（America/Asia/...）→ regions.*
    const regionName = country && IANA_REGION_KEYS[country]
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

    // 4) 兜底：不再原样返回中文硬编码；显示未知
    return t('card.unknownCountry')
  }

  return {
    getCityName,
    getCountryName,
  }
}
