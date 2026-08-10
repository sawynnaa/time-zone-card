/**
 * 利用浏览器 Intl 将 IANA 时区 / 国家代码解析为当前语言下的显示名。
 * 国家、地区、城市名称必须严格跟随 UI 语言。
 */

import { getTimezoneCountryCode } from '@/data/timezone-countries'

const ABBREV_RE = /^[A-Z]{1,5}$/
const ISO_COUNTRY_RE = /^[A-Z]{2}$/
/** 是否包含拉丁字母词（用于判断是否仍是英文回退） */
const LATIN_WORD_RE = /[A-Za-z]{2,}/
/** CJK 统一汉字 */
const CJK_RE = /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/

/**
 * ISO → 项目内 i18n 键（仅特殊文案；其余走 Intl.DisplayNames）
 */
export const ISO_TO_I18N_COUNTRY_KEY: Record<string, string> = {
  TW: 'taiwan',
}

/** 遗留中文国家名 → ISO */
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

function getRegionDisplayNames(locale: string, style: 'long' | 'short'): Intl.DisplayNames | null {
  const cacheKey = `${locale}:${style}`
  try {
    let dn = displayNamesCache.get(cacheKey)
    if (!dn) {
      dn = new Intl.DisplayNames([locale], { type: 'region', style })
      displayNamesCache.set(cacheKey, dn)
    }
    return dn
  }
  catch {
    try {
      const dn = new Intl.DisplayNames([locale], { type: 'region' })
      displayNamesCache.set(cacheKey, dn)
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
      result = result
        .replace(/标准时间$/u, '')
        .replace(/夏令时间$/u, '')
        .replace(/时间$/u, '')
        .replace(/時區$/u, '')
      break
    case 'ja':
      result = result
        .replace(/標準時$/u, '')
        .replace(/夏時間$/u, '')
        .replace(/時間$/u, '')
      break
    case 'ko':
      result = result
        .replace(/\s*표준시$/u, '')
        .replace(/\s*시간$/u, '')
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
      result = result
        .replace(/\s+Standard Time$/iu, '')
        .replace(/\s+Daylight Time$/iu, '')
        .replace(/\s+Summer Time$/iu, '')
        .replace(/\s+Time$/iu, '')
      break
  }

  // 去掉括号补充，如「夏威夷-阿留申时间（埃达克）」→ 优先取括号内城市
  const paren = result.match(/[（(]([^）)]+)[）)]/)
  if (paren?.[1])
    return paren[1].trim()

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

/** 当前语言是否倾向 CJK 书写 */
function isCjkLocale(locale: string): boolean {
  const base = locale.toLowerCase().split('-')[0] ?? ''
  return base === 'zh' || base === 'ja' || base === 'ko'
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
 */
export function resolveCountryIso(
  country: string | undefined,
  timezone?: string,
): string | undefined {
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

  if (ISO_COUNTRY_RE.test(trimmed))
    return trimmed

  if (LEGACY_ZH_COUNTRY_TO_ISO[trimmed])
    return LEGACY_ZH_COUNTRY_TO_ISO[trimmed]

  const lower = trimmed.toLowerCase()
  if (I18N_COUNTRY_KEY_TO_ISO[lower])
    return I18N_COUNTRY_KEY_TO_ISO[lower]

  return undefined
}

/**
 * 用当前语言本地化 ISO 国家/地区代码
 * - en 下 short 常返回 "US"/"UK"，此时改用 long
 * - zh 下 short 更简洁（香港 vs 中国香港特别行政区）
 */
export function localizeIsoCountry(
  isoCode: string,
  locale: string,
): string | undefined {
  if (!isoCode)
    return undefined

  const code = isoCode.toUpperCase()

  try {
    const shortName = getRegionDisplayNames(locale, 'short')?.of(code)
    const longName = getRegionDisplayNames(locale, 'long')?.of(code)

    // short 若只是代码本身（US/GB），不可用
    const shortUsable = shortName
      && shortName.toUpperCase() !== code
      && !isLowQualityName(shortName)

    if (shortUsable) {
      // CJK：优先 short（更短）
      if (isCjkLocale(locale))
        return shortName
      // 拉丁语系：若 short 过短（≤3）更像缩写，用 long
      if (shortName.length <= 3 && longName && longName !== code)
        return longName
      return shortName
    }

    if (longName && longName.toUpperCase() !== code)
      return longName
  }
  catch {
    // ignore
  }
  return undefined
}

/**
 * 从 Intl 提取时区显示名（多策略）
 */
function extractIntlZoneLabel(timezone: string, locale: string): string | undefined {
  const strategies: Array<Intl.DateTimeFormatOptions['timeZoneName']> = [
    'shortGeneric',
    'longGeneric',
    'long',
  ]

  for (const timeZoneName of strategies) {
    try {
      const parts = new Intl.DateTimeFormat(locale, {
        timeZone: timezone,
        timeZoneName,
      }).formatToParts(new Date())

      const raw = parts.find(p => p.type === 'timeZoneName')?.value ?? ''
      const stripped = stripTimeLabel(raw, locale)
      if (!isLowQualityName(stripped))
        return stripped
    }
    catch {
      // try next
    }
  }
  return undefined
}

/**
 * 获取时区在指定语言下的「城市/地点」显示名
 * 例：America/New_York + zh-CN →「纽约」
 */
export function getTimezoneCityDisplayName(timezone: string, locale: string): string {
  if (!timezone)
    return ''

  if (timezone.startsWith('Etc/'))
    return getIanaCityFallback(timezone)

  const ianaFallback = getIanaCityFallback(timezone)
  const countryIso = getTimezoneCountryCode(timezone)
  const countryName = countryIso ? localizeIsoCountry(countryIso, locale) : undefined

  const intlLabel = extractIntlZoneLabel(timezone, locale)

  if (intlLabel) {
    // Intl 结果与国家名相同（如「日本时间」→「日本」）时：
    // - CJK 下仍优先本地化结果，避免回退英文 IANA 城市段
    // - 拉丁语系下 IANA 城市段更像城市名（Tokyo vs Japan）
    if (countryName && intlLabel === countryName) {
      if (isCjkLocale(locale))
        return intlLabel
      return ianaFallback
    }

    // CJK 下若 Intl 结果仍是纯拉丁文，回退 IANA 段（两者都是英文，至少一致）
    if (isCjkLocale(locale) && LATIN_WORD_RE.test(intlLabel) && !CJK_RE.test(intlLabel))
      return ianaFallback

    return intlLabel
  }

  return ianaFallback
}

/**
 * 时区本身的本地化展示名（用于「时区 / 国家」列的时区部分）
 * 优先地点名，而不是生硬的 America/New_York
 */
export function getTimezoneDisplayLabel(timezone: string, locale: string): string {
  if (!timezone)
    return ''
  if (timezone.startsWith('Etc/'))
    return timezone.replace(/^Etc\//, '') || timezone

  return getTimezoneCityDisplayName(timezone, locale) || getIanaCityFallback(timezone)
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
