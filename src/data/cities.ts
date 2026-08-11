import type { TimezoneCity } from '@/types/timezone'
import { getTimezoneOffset } from '@/utils/timezone-helpers'
import { getTimezoneCountryCode } from '@/data/timezone-countries'
import { getIanaCityFallback } from '@/utils/timezone-locale'

/** 按 UTC 偏移量分组后的时区城市列表 */
export interface OffsetGroup {
  offsetMinutes: number
  label: string
  cities: TimezoneCity[]
}

/**
 * 按 IANA 时区聚合后的条目（参考 zeitverschiebung 全部时区列表）
 * 一列：协调世界时 + 本地时间；一列：时区 + 国家；一列：主要城市
 */
export interface TimezoneZoneEntry {
  timezone: string
  offsetMinutes: number
  offsetLabel: string
  /** 代表国家/区域（优先常用城市的国家名） */
  country: string
  cities: TimezoneCity[]
  /** 默认用于「按时区添加」的代表城市 */
  primaryCity: TimezoneCity
}

/** 将分钟偏移格式化为 UTC±N / UTC±N:MM */
export function formatOffsetLabel(offsetMinutes: number, prefix = 'UTC'): string {
  const hours = Math.floor(Math.abs(offsetMinutes) / 60)
  const minutes = Math.abs(offsetMinutes) % 60
  const sign = offsetMinutes >= 0 ? '+' : '-'
  if (minutes === 0)
    return `${prefix}${sign}${hours}`
  return `${prefix}${sign}${hours}:${minutes.toString().padStart(2, '0')}`
}

function sortCitiesInZone(a: TimezoneCity, b: TimezoneCity): number {
  if (a.commonCity !== b.commonCity)
    return a.commonCity ? -1 : 1
  return a.city.localeCompare(b.city, 'en')
}

/**
 * 按当前（或指定日期）UTC 偏移量对城市分组，从西到东排序（约 UTC-11 … UTC+14）
 */
export function groupCitiesByOffset(cities: TimezoneCity[], date?: Date): OffsetGroup[] {
  const map = new Map<number, TimezoneCity[]>()

  for (const city of cities) {
    const offset = getTimezoneOffset(city.timezone, date)
    const list = map.get(offset)
    if (list) {
      list.push(city)
    }
    else {
      map.set(offset, [city])
    }
  }

  const sortedOffsets = [...map.keys()].sort((a, b) => a - b)

  return sortedOffsets.map((offset) => {
    const groupCities = [...(map.get(offset) ?? [])]
    groupCities.sort(sortCitiesInZone)
    return {
      offsetMinutes: offset,
      label: formatOffsetLabel(offset),
      cities: groupCities,
    }
  })
}

/**
 * 按 IANA 时区聚合城市，按当前 UTC 偏移从西到东排序。
 * 同一时区下的多个城市（如 北京/上海）会出现在「主要城市」列。
 */
export function groupByIanaTimezone(cities: TimezoneCity[], date?: Date): TimezoneZoneEntry[] {
  const map = new Map<string, TimezoneCity[]>()

  for (const city of cities) {
    const list = map.get(city.timezone)
    if (list) {
      list.push(city)
    }
    else {
      map.set(city.timezone, [city])
    }
  }

  const entries: TimezoneZoneEntry[] = []

  for (const [timezone, zoneCities] of map) {
    const sorted = [...zoneCities].sort(sortCitiesInZone)
    const primaryCity = sorted[0]!
    const countryCity = sorted.find(c => c.commonCity) ?? primaryCity
    const offsetMinutes = getTimezoneOffset(timezone, date)

    entries.push({
      timezone,
      offsetMinutes,
      offsetLabel: formatOffsetLabel(offsetMinutes),
      // 优先 ISO 国家代码，保证展示层可用 Intl 按语言本地化
      country: getTimezoneCountryCode(timezone) || countryCity.country,
      cities: sorted,
      primaryCity,
    })
  }

  entries.sort((a, b) => {
    if (a.offsetMinutes !== b.offsetMinutes)
      return a.offsetMinutes - b.offsetMinutes
    return a.timezone.localeCompare(b.timezone)
  })

  return entries
}

/** 从时区条目列表提取偏移快捷导航（去重，保持顺序） */
export function getOffsetNavFromZones(zones: TimezoneZoneEntry[]): Array<{
  offsetMinutes: number
  label: string
  count: number
}> {
  const map = new Map<number, { label: string, count: number }>()
  for (const zone of zones) {
    const existing = map.get(zone.offsetMinutes)
    if (existing) {
      existing.count += 1
    }
    else {
      map.set(zone.offsetMinutes, { label: zone.offsetLabel, count: 1 })
    }
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([offsetMinutes, { label, count }]) => ({ offsetMinutes, label, count }))
}

/**
 * 按国家/地区聚合后的条目（英文国名 A–Z 排序）
 * 左列：国家；右列：常见城市
 */
export interface CountryGroup {
  /** ISO 3166-1 alpha-2 */
  countryCode: string
  /** 英文国名（排序与字母索引固定用 en） */
  englishName: string
  /** A–Z 或 # */
  letter: string
  /** 该国全部城市（common 优先，再按英文城市名） */
  cities: TimezoneCity[]
  /** 默认展示的常见城市（有 common 用 common，否则取前若干） */
  commonCities: TimezoneCity[]
}

const ISO_CODE_RE = /^[A-Z]{2}$/
const DEFAULT_CITIES_PER_COUNTRY = 6

let enRegionDisplayNames: Intl.DisplayNames | null | undefined

function getEnglishCountryName(isoCode: string): string {
  try {
    if (enRegionDisplayNames === undefined) {
      try {
        enRegionDisplayNames = new Intl.DisplayNames(['en'], { type: 'region', style: 'long' })
      }
      catch {
        enRegionDisplayNames = null
      }
    }
    const name = enRegionDisplayNames?.of(isoCode)
    if (name && name.toUpperCase() !== isoCode)
      return name
  }
  catch {
    // ignore
  }
  return isoCode
}

function resolveCityIsoCode(city: TimezoneCity): string | undefined {
  const fromTz = getTimezoneCountryCode(city.timezone)
  if (fromTz && ISO_CODE_RE.test(fromTz))
    return fromTz

  const raw = (city.country || '').trim().toUpperCase()
  if (ISO_CODE_RE.test(raw))
    return raw

  return undefined
}

function letterFromEnglishName(englishName: string): string {
  const ch = englishName.trim().charAt(0).toUpperCase()
  if (ch >= 'A' && ch <= 'Z')
    return ch
  return '#'
}

/**
 * 按 ISO 国家聚合城市，按英文国名 A–Z 排序。
 * 无 ISO 映射的条目（如部分 Etc/*）会被跳过。
 */
export function groupByCountry(
  cities: TimezoneCity[],
  options?: { defaultCityLimit?: number },
): CountryGroup[] {
  const limit = options?.defaultCityLimit ?? DEFAULT_CITIES_PER_COUNTRY
  const map = new Map<string, TimezoneCity[]>()

  for (const city of cities) {
    const iso = resolveCityIsoCode(city)
    if (!iso)
      continue
    const list = map.get(iso)
    if (list)
      list.push(city)
    else
      map.set(iso, [city])
  }

  const groups: CountryGroup[] = []

  for (const [countryCode, groupCities] of map) {
    const sorted = [...groupCities].sort(sortCitiesInZone)
    // 同 id 去重（别名等边界情况）
    const seen = new Set<string>()
    const unique = sorted.filter((c) => {
      if (seen.has(c.id))
        return false
      seen.add(c.id)
      return true
    })

    const common = unique.filter(c => c.commonCity)
    const commonCities = common.length > 0 ? common : unique.slice(0, limit)
    const englishName = getEnglishCountryName(countryCode)

    groups.push({
      countryCode,
      englishName,
      letter: letterFromEnglishName(englishName),
      cities: unique,
      commonCities,
    })
  }

  groups.sort((a, b) => {
    if (a.letter === '#' && b.letter !== '#')
      return 1
    if (b.letter === '#' && a.letter !== '#')
      return -1
    return a.englishName.localeCompare(b.englishName, 'en')
  })

  return groups
}

/** 从国家分组提取字母快捷导航（去重，A–Z 再 #） */
export function getLetterNavFromCountries(groups: CountryGroup[]): Array<{
  letter: string
  count: number
}> {
  const map = new Map<string, number>()
  for (const g of groups) {
    map.set(g.letter, (map.get(g.letter) ?? 0) + 1)
  }
  return [...map.entries()]
    .sort((a, b) => {
      if (a[0] === '#')
        return 1
      if (b[0] === '#')
        return -1
      return a[0].localeCompare(b[0])
    })
    .map(([letter, count]) => ({ letter, count }))
}

// 常用城市列表（country 使用 ISO 代码；city 使用英文规范名，UI 显示走 i18n/Intl）
export const COMMON_CITIES: TimezoneCity[] = [
  // China
  { id: 'beijing', city: 'Beijing', country: 'CN', timezone: 'Asia/Shanghai', offset: 480, commonCity: true },
  { id: 'shanghai', city: 'Shanghai', country: 'CN', timezone: 'Asia/Shanghai', offset: 480, commonCity: true },
  { id: 'hongkong', city: 'Hong Kong', country: 'HK', timezone: 'Asia/Hong_Kong', offset: 480, commonCity: true },
  { id: 'taipei', city: 'Taipei', country: 'TW', timezone: 'Asia/Taipei', offset: 480, commonCity: true },

  // Asia
  { id: 'tokyo', city: 'Tokyo', country: 'JP', timezone: 'Asia/Tokyo', offset: 540, commonCity: true },
  { id: 'seoul', city: 'Seoul', country: 'KR', timezone: 'Asia/Seoul', offset: 540, commonCity: true },
  { id: 'singapore', city: 'Singapore', country: 'SG', timezone: 'Asia/Singapore', offset: 480, commonCity: true },
  { id: 'bangkok', city: 'Bangkok', country: 'TH', timezone: 'Asia/Bangkok', offset: 420, commonCity: true },
  { id: 'dubai', city: 'Dubai', country: 'AE', timezone: 'Asia/Dubai', offset: 240, commonCity: true },
  { id: 'mumbai', city: 'Mumbai', country: 'IN', timezone: 'Asia/Kolkata', offset: 330, commonCity: true },

  // Oceania
  { id: 'sydney', city: 'Sydney', country: 'AU', timezone: 'Australia/Sydney', offset: 660, commonCity: true },
  { id: 'melbourne', city: 'Melbourne', country: 'AU', timezone: 'Australia/Melbourne', offset: 660, commonCity: true },
  { id: 'auckland', city: 'Auckland', country: 'NZ', timezone: 'Pacific/Auckland', offset: 780, commonCity: true },

  // Europe
  { id: 'london', city: 'London', country: 'GB', timezone: 'Europe/London', offset: 0, commonCity: true },
  { id: 'paris', city: 'Paris', country: 'FR', timezone: 'Europe/Paris', offset: 60, commonCity: true },
  { id: 'berlin', city: 'Berlin', country: 'DE', timezone: 'Europe/Berlin', offset: 60, commonCity: true },
  { id: 'rome', city: 'Rome', country: 'IT', timezone: 'Europe/Rome', offset: 60, commonCity: true },
  { id: 'madrid', city: 'Madrid', country: 'ES', timezone: 'Europe/Madrid', offset: 60, commonCity: true },
  { id: 'moscow', city: 'Moscow', country: 'RU', timezone: 'Europe/Moscow', offset: 180, commonCity: true },
  { id: 'amsterdam', city: 'Amsterdam', country: 'NL', timezone: 'Europe/Amsterdam', offset: 60, commonCity: true },

  // Americas
  { id: 'newyork', city: 'New York', country: 'US', timezone: 'America/New_York', offset: -300, commonCity: true },
  { id: 'losangeles', city: 'Los Angeles', country: 'US', timezone: 'America/Los_Angeles', offset: -480, commonCity: true },
  { id: 'chicago', city: 'Chicago', country: 'US', timezone: 'America/Chicago', offset: -360, commonCity: true },
  { id: 'denver', city: 'Denver', country: 'US', timezone: 'America/Denver', offset: -420, commonCity: true },
  { id: 'toronto', city: 'Toronto', country: 'CA', timezone: 'America/Toronto', offset: -300, commonCity: true },
  { id: 'vancouver', city: 'Vancouver', country: 'CA', timezone: 'America/Vancouver', offset: -480, commonCity: true },
  { id: 'mexico_city', city: 'Mexico City', country: 'MX', timezone: 'America/Mexico_City', offset: -360, commonCity: true },
  { id: 'sao_paulo', city: 'São Paulo', country: 'BR', timezone: 'America/Sao_Paulo', offset: -180, commonCity: true },
  { id: 'buenos_aires', city: 'Buenos Aires', country: 'AR', timezone: 'America/Argentina/Buenos_Aires', offset: -180, commonCity: true },

  // Africa
  { id: 'cairo', city: 'Cairo', country: 'EG', timezone: 'Africa/Cairo', offset: 120, commonCity: true },
  { id: 'johannesburg', city: 'Johannesburg', country: 'ZA', timezone: 'Africa/Johannesburg', offset: 120, commonCity: true },
]

// 默认显示的城市ID列表
export const DEFAULT_CARD_CITIES = ['beijing', 'tokyo', 'newyork', 'london']

/** 解析时区对应的 country 字段：优先 ISO，否则 IANA 区域段 */
function resolveCountryField(timezone: string): string {
  return getTimezoneCountryCode(timezone) || timezone.split('/')[0] || 'Etc'
}

// 获取所有IANA时区并转换为城市数据（用于搜索功能）
export const ALL_TIMEZONES: TimezoneCity[] = (() => {
  try {
    const allCities = [...COMMON_CITIES]
    const allIanaTimezones = (Intl as any).supportedValuesOf('timeZone') as string[]
    const existingTimezones = new Set(COMMON_CITIES.map(c => c.timezone))

    // 兼容浏览器使用的别名（如 America/Buenos_Aires ↔ America/Argentina/Buenos_Aires）
    const aliasOccupied = new Set(existingTimezones)
    for (const tz of existingTimezones) {
      // 若常用城市占用了规范名，别名也视为已占用
      if (tz === 'America/Argentina/Buenos_Aires')
        aliasOccupied.add('America/Buenos_Aires')
      if (tz === 'Asia/Kolkata')
        aliasOccupied.add('Asia/Calcutta')
    }

    allIanaTimezones.forEach((tz: string) => {
      if (aliasOccupied.has(tz) || existingTimezones.has(tz))
        return

      const cityName = getIanaCityFallback(tz)
      if (!cityName)
        return

      allCities.push({
        id: tz.toLowerCase().replace(/\//g, '-'),
        city: cityName,
        country: resolveCountryField(tz),
        timezone: tz,
        offset: 0,
        commonCity: false,
      })
    })

    return allCities
  }
  catch {
    return COMMON_CITIES
  }
})()

// 根据城市ID获取城市信息
export function getCityById(id: string): TimezoneCity | undefined {
  return ALL_TIMEZONES.find(city => city.id === id)
}

// 根据时区获取城市信息
export function getCityByTimezone(timezone: string): TimezoneCity | undefined {
  return ALL_TIMEZONES.find(city => city.timezone === timezone)
}
