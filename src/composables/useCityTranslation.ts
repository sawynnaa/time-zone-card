import { useI18n } from 'vue-i18n'
import { getCountryKey } from '@/data/cities'

/**
 * 城市和国家名称翻译 Composable
 */
export function useCityTranslation() {
  const { t } = useI18n()

  /**
   * 获取城市名称的翻译
   * @param cityId 城市ID
   * @returns 翻译后的城市名称
   */
  function getCityName(cityId: string): string {
    const key = `cities.${cityId}`
    const translated = t(key)
    // 如果翻译键不存在，返回城市ID（格式化：移除下划线，首字母大写）
    if (translated === key) {
      return cityId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
    return translated
  }

  /**
   * 获取国家名称的翻译
   * @param countryName 国家名称（中文）
   * @returns 翻译后的国家名称
   */
  function getCountryName(countryName: string): string {
    const countryKey = getCountryKey(countryName)
    const key = `countries.${countryKey}`
    const translated = t(key)
    // 如果翻译键不存在，返回原始国家名称
    if (translated === key) {
      return countryName
    }
    return translated
  }

  return {
    getCityName,
    getCountryName,
  }
}
