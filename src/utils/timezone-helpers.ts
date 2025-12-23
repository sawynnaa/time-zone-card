import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
// 导入 dayjs 的语言包
import 'dayjs/locale/zh-cn'
import 'dayjs/locale/en'
import 'dayjs/locale/ja'
import 'dayjs/locale/ko'
import 'dayjs/locale/de'
import 'dayjs/locale/fr'
import 'dayjs/locale/es'
import 'dayjs/locale/it'
import 'dayjs/locale/pt'

// 初始化 Day.js 插件
dayjs.extend(utc)
dayjs.extend(timezone)

// 导出配置好的 dayjs 实例
export { dayjs }

/**
 * 将 i18n 的 locale code 映射到 dayjs 的 locale code
 */
export function mapLocaleToDayjsLocale(locale: string): string {
  const localeMap: Record<string, string> = {
    'zh-CN': 'zh-cn',
    'en': 'en',
    'ja': 'ja',
    'ko': 'ko',
    'de': 'de',
    'fr': 'fr',
    'es': 'es',
    'it': 'it',
    'pt': 'pt',
  }
  return localeMap[locale] || 'en'
}

// 检查时区是否处于夏令时
export function isDST(timezoneStr: string, date?: Date | Dayjs): boolean {
  try {
    const currentDate = dayjs(date)

    // 获取冬季偏移量（1月）
    const winterOffset = dayjs.tz('2024-01-01', timezoneStr).utcOffset()
    // 获取夏季偏移量（7月）
    const summerOffset = dayjs.tz('2024-07-01', timezoneStr).utcOffset()
    // 获取当前偏移量
    const currentOffset = dayjs.tz(currentDate, timezoneStr).utcOffset()

    // 如果当前偏移量不等于标准时间（较小的偏移量），则处于夏令时
    return currentOffset !== Math.min(winterOffset, summerOffset)
  }
  catch {
    return false
  }
}

// 获取所有可用的时区列表
export function getAllTimezones(): string[] {
  try {
    return (Intl as any).supportedValuesOf('timeZone') as string[]
  }
  catch {
    // 如果浏览器不支持，返回空数组
    return []
  }
}

// 获取时区的 UTC 偏移量（分钟）
export function getTimezoneOffset(timezoneStr: string, date?: Date | Dayjs): number {
  try {
    return dayjs.tz(dayjs(date), timezoneStr).utcOffset()
  }
  catch {
    return 0
  }
}
