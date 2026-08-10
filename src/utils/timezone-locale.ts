/**
 * 利用浏览器 Intl 将 IANA 时区 / 国家代码解析为当前语言下的显示名。
 * 确保国家、地区、城市名称始终跟随 UI 语言，避免中英文混用。
 */

import { getTimezoneCountryCode } from '@/data/timezone-countries'

const ABBREV_RE = /^[A-Z]{1,5}$/
const ISO_COUNTRY_RE = /^[A-Z]{2}$/

/**
 * ISO 国家代码 → 项目内 i18n 键
 * 仅对需要特殊文案的条目使用（如台湾）；其余走 Intl.DisplayNames
 */
export const ISO_TO_I18N_COUNTRY_KEY: Record<string, string> = {
  // 仅台湾使用项目内固定文案；香港/澳门走 DisplayNames（中国香港 / Hong Kong 等）
  TW: 'taiwan',
}

/** 遗留中文国家名 → ISO（兼容旧数据） */
const LEGACY_ZH_COUNTRY_TO_ISO: Record<string, string> = {
  '中国': 'CN',
  '中国台湾': 'TW',
  '日本': 'JP',
  '韩国': 'KR',
  '新加坡': 'SG',
  '泰国': 'TH',
  '阿联酋': 'AE',
  '印度': 'IN',
  '澳大利亚': 'AU',
  '新西兰': 'NZ',
  '英国': 'GB',
  '法国': 'FR',
  '德国': 'DE',
  '意大利': 'IT',
  '西班牙': 'ES',
  '俄罗斯': 'RU',
  '荷兰': 'NL',
  '美国': 'US',
  '加拿大': 'CA',
  '墨西哥': 'MX',
  '巴西': 'BR',
  '阿根廷': 'AR',
  '埃及': 'EG',
  '南非': 'ZA',
}

/** 遗留 i18n 国家键 → ISO */
const I18N_COUNTRY_KEY_TO_ISO: Record<string, string> = {
  china: 'CN',
  taiwan: 'TW',
  japan: 'JP',
  korea: 'KR',
  singapore: 'SG',
  thailand: 'TH',
  uae: 'AE',
  india: 'IN',
  australia: 'AU',
  newzealand: 'NZ',
  uk: 'GB',
  france: 'FR',
  germany: 'DE',
  italy: 'IT',
  spain: 'ES',
  russia: 'RU',
  netherlands: 'NL',
  usa: 'US',
  canada: 'CA',
  mexico: 'MX',
  brazil: 'BR',
  argentina: 'AR',
  egypt: 'EG',
  southafrica: 'ZA',
}

/** IANA 区域段 → 翻译键 */
export const IANA_REGION_KEYS: Record<string, string> = {
  Africa: 'africa',
  America: 'america',
  Antarctica: 'antarctica',
  Arctic: 'arctic',
  Asia: 'asia',
  Atlantic: 'atlantic',
  Australia: 'australia',
  Europe: 'europe',
  Indian: 'indian',
  Pacific: 'pacific',
  Etc: 'etc',
}

const displayNamesCache = new Map<string, Intl.DisplayNames>()

function getRegionDisplayNames(locale: string): Intl.DisplayNames | null {
  try {
    let dn = displayNamesCache.get(locale)
    if (!dn) {
      // short：香港/美国；long 会变成「中国香港特别行政区」等过长文案
      dn = new Intl.DisplayNames([locale], { type: 'region', style: 'short' })
      displayNamesCache.set(locale, dn)
    }
    return dn
  }
  catch {
    // 部分环境可能不支持 style: short，回退默认
    try {
      const dn = new Intl.DisplayNames([locale], { type: 'region' })
      displayNamesCache.set(locale, dn)
      return dn
    }
    catch {
      return null
    }
  }
}

function stripTimeLabel(name: string, locale: string): string {
  const base = locale.toLowerCase().split('-')[0] ?? locale
  let result = name.trim()

  switch (base) {
    case 'zh':
      result = result.replace(/时间$/u, '').replace(/時區$/u, '')
      break
    case 'ja':
      result = result.replace(/時間$/u, '').replace(/標準時$/u, '')
      break
    case 'ko':
      result = result.replace(/\s*시간$/u, '')
      break
    case 'de':
      result = result.replace(/\s*\(Ortszeit\)$/u, '')
      break
    case 'fr':
      result = result.replace(/^heure\s*:\s*/iu, '')
      break
    case 'es':
      result = result.replace(/^hora de\s+/iu, '')
      break
    case 'it':
      result = result.replace(/^Ora\s+/u, '')
      break
    case 'pt':
      result = result.replace(/^Horário\s+/iu, '')
      break
    default:
      result = result.replace(/\s+Standard Time$/iu, '').replace(/\s+Time$/iu, '')
      break
  }

  return result.trim()
}

function isLowQualityName(name: string): boolean {
  if (!name || name.length < 2)
    return true
  if (ABBREV_RE.test(name))
    return true
  if (name === 'GMT' || name === 'UTC')
    return true
  return false
}

/** 从 IANA 路径取末段城市名（英文） */
export function getIanaCityFallback(timezone: string): string {
  if (timezone.startsWith('Etc/'))
    return timezone.replace(/^Etc\//, '')

  const parts = timezone.split('/')
  const last = parts[parts.length - 1] || timezone
  return last.replace(/_/g, ' ')
}

/**
 * 将任意历史/当前 country 字段规范为 ISO 代码
 * 支持：ISO、遗留中文名、i18n 键、IANA 区域段
 */
export function resolveCountryIso(
  country: string | undefined,
  timezone?: string,
): string | undefined {
  // 优先用时区映射（最准确）
  if (timezone) {
    const fromTz = getTimezoneCountryCode(timezone)
    if (fromTz)
      return fromTz
  }

  if (!country)
    return undefined

  const trimmed = country.trim()
  if (!trimmed)
    return undefined

  // 已是 ISO
  if (ISO_COUNTRY_RE.test(trimmed))
    return trimmed

  // 遗留中文
  if (LEGACY_ZH_COUNTRY_TO_ISO[trimmed])
    return LEGACY_ZH_COUNTRY_TO_ISO[trimmed]

  // i18n 键
  const lower = trimmed.toLowerCase()
  if (I18N_COUNTRY_KEY_TO_ISO[lower])
    return I18N_COUNTRY_KEY_TO_ISO[lower]

  return undefined
}

/**
 * 用当前语言本地化 ISO 国家/地区代码
 */
export function localizeIsoCountry(
  isoCode: string,
  locale: string,
): string | undefined {
  if (!isoCode)
    return undefined

  try {
    const dn = getRegionDisplayNames(locale)
    const name = dn?.of(isoCode.toUpperCase())
    if (name && name !== isoCode)
      return name
  }
  catch {
    // ignore
  }
  return undefined
}

/**
 * 获取时区在指定语言下的城市/地区显示名
 * 例：America/New_York + zh-CN →「纽约」
 */
export function getTimezoneCityDisplayName(timezone: string, locale: string): string {
  if (!timezone)
    return ''

  if (timezone.startsWith('Etc/'))
    return getIanaCityFallback(timezone)

  const fallback = getIanaCityFallback(timezone)
  const countryIso = getTimezoneCountryCode(timezone)
  const countryName = countryIso ? localizeIsoCountry(countryIso, locale) : undefined

  try {
    const parts = new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      timeZoneName: 'shortGeneric',
    }).formatToParts(new Date())

    const raw = parts.find(p => p.type === 'timeZoneName')?.value ?? ''
    const stripped = stripTimeLabel(raw, locale)

    // 若 Intl 返回的是国家名（如「日本时间」→「日本」），则回退到 IANA 城市段
    if (!isLowQualityName(stripped) && stripped !== countryName)
      return stripped
  }
  catch {
    // Intl 不支持该时区时回退
  }

  return fallback
}

/**
 * 获取 IANA 时区的区域段（America / Asia / ...）
 */
export function getIanaRegion(timezone: string): string | undefined {
  if (!timezone)
    return undefined
  const region = timezone.split('/')[0]
  return region || undefined
}
