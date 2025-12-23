import type { TimezoneCity } from '@/types/timezone'

// 常用城市列表（包含夏令时代表城市）
export const COMMON_CITIES: TimezoneCity[] = [
  // 中国
  { id: 'beijing', city: '北京', country: '中国', timezone: 'Asia/Shanghai', offset: 480, commonCity: true },
  { id: 'shanghai', city: '上海', country: '中国', timezone: 'Asia/Shanghai', offset: 480, commonCity: true },
  { id: 'hongkong', city: '香港', country: '中国', timezone: 'Asia/Hong_Kong', offset: 480, commonCity: true },
  { id: 'taipei', city: '台北', country: '中国台湾', timezone: 'Asia/Taipei', offset: 480, commonCity: true },

  // 亚洲其他
  { id: 'tokyo', city: '东京', country: '日本', timezone: 'Asia/Tokyo', offset: 540, commonCity: true },
  { id: 'seoul', city: '首尔', country: '韩国', timezone: 'Asia/Seoul', offset: 540, commonCity: true },
  { id: 'singapore', city: '新加坡', country: '新加坡', timezone: 'Asia/Singapore', offset: 480, commonCity: true },
  { id: 'bangkok', city: '曼谷', country: '泰国', timezone: 'Asia/Bangkok', offset: 420, commonCity: true },
  { id: 'dubai', city: '迪拜', country: '阿联酋', timezone: 'Asia/Dubai', offset: 240, commonCity: true },
  { id: 'mumbai', city: '孟买', country: '印度', timezone: 'Asia/Kolkata', offset: 330, commonCity: true },

  // 大洋洲
  { id: 'sydney', city: '悉尼', country: '澳大利亚', timezone: 'Australia/Sydney', offset: 660, commonCity: true },
  { id: 'melbourne', city: '墨尔本', country: '澳大利亚', timezone: 'Australia/Melbourne', offset: 660, commonCity: true },
  { id: 'auckland', city: '奥克兰', country: '新西兰', timezone: 'Pacific/Auckland', offset: 780, commonCity: true },

  // 欧洲
  { id: 'london', city: '伦敦', country: '英国', timezone: 'Europe/London', offset: 0, commonCity: true },
  { id: 'paris', city: '巴黎', country: '法国', timezone: 'Europe/Paris', offset: 60, commonCity: true },
  { id: 'berlin', city: '柏林', country: '德国', timezone: 'Europe/Berlin', offset: 60, commonCity: true },
  { id: 'rome', city: '罗马', country: '意大利', timezone: 'Europe/Rome', offset: 60, commonCity: true },
  { id: 'madrid', city: '马德里', country: '西班牙', timezone: 'Europe/Madrid', offset: 60, commonCity: true },
  { id: 'moscow', city: '莫斯科', country: '俄罗斯', timezone: 'Europe/Moscow', offset: 180, commonCity: true },
  { id: 'amsterdam', city: '阿姆斯特丹', country: '荷兰', timezone: 'Europe/Amsterdam', offset: 60, commonCity: true },

  // 美洲
  { id: 'newyork', city: '纽约', country: '美国', timezone: 'America/New_York', offset: -300, commonCity: true },
  { id: 'losangeles', city: '洛杉矶', country: '美国', timezone: 'America/Los_Angeles', offset: -480, commonCity: true },
  { id: 'chicago', city: '芝加哥', country: '美国', timezone: 'America/Chicago', offset: -360, commonCity: true },
  { id: 'denver', city: '丹佛', country: '美国', timezone: 'America/Denver', offset: -420, commonCity: true },
  { id: 'toronto', city: '多伦多', country: '加拿大', timezone: 'America/Toronto', offset: -300, commonCity: true },
  { id: 'vancouver', city: '温哥华', country: '加拿大', timezone: 'America/Vancouver', offset: -480, commonCity: true },
  { id: 'mexico_city', city: '墨西哥城', country: '墨西哥', timezone: 'America/Mexico_City', offset: -360, commonCity: true },
  { id: 'sao_paulo', city: '圣保罗', country: '巴西', timezone: 'America/Sao_Paulo', offset: -180, commonCity: true },
  { id: 'buenos_aires', city: '布宜诺斯艾利斯', country: '阿根廷', timezone: 'America/Argentina/Buenos_Aires', offset: -180, commonCity: true },

  // 非洲
  { id: 'cairo', city: '开罗', country: '埃及', timezone: 'Africa/Cairo', offset: 120, commonCity: true },
  { id: 'johannesburg', city: '约翰内斯堡', country: '南非', timezone: 'Africa/Johannesburg', offset: 120, commonCity: true },
]

// 默认显示的城市ID列表
export const DEFAULT_CARD_CITIES = ['beijing', 'tokyo', 'newyork', 'london']

// 获取所有IANA时区并转换为城市数据（用于搜索功能）
export const ALL_TIMEZONES: TimezoneCity[] = (() => {
  try {
    // 首先包含所有常用城市
    const allCities = [...COMMON_CITIES]

    // 获取所有IANA时区
    const allIanaTimezones = (Intl as any).supportedValuesOf('timeZone') as string[]

    // 将IANA时区转换为城市数据（排除已存在的常用城市）
    const existingTimezones = new Set(COMMON_CITIES.map(c => c.timezone))

    allIanaTimezones.forEach((tz: string) => {
      if (!existingTimezones.has(tz)) {
        const parts = tz.split('/')
        const cityName = parts[parts.length - 1]
        const country = parts[0]

        if (cityName && country) {
          allCities.push({
            id: tz.toLowerCase().replace(/\//g, '-'),
            city: cityName.replace(/_/g, ' '), // 英文名称（可以后续翻译）
            country,
            timezone: tz,
            offset: 0, // 需要动态计算
            commonCity: false,
          })
        }
      }
    })

    return allCities
  }
  catch {
    // 如果浏览器不支持 Intl.supportedValuesOf，只返回常用城市
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
