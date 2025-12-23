import type { Dayjs } from 'dayjs'
import { dayjs, mapLocaleToDayjsLocale } from '@/utils/timezone-helpers'
import { useLocaleStore } from '@/stores/localeStore'

/**
 * 格式化时间显示
 * @param date Dayjs 对象
 * @param is24Hour 是否为24小时制
 * @returns 格式化后的时间字符串
 */
export function formatTime(date: Dayjs, is24Hour: boolean): string {
  if (is24Hour) {
    return date.format('HH:mm')
  }
  else {
    return date.format('hh:mm A')
  }
}

/**
 * 格式化日期显示
 * @param date Dayjs 对象
 * @returns 格式化后的日期字符串，例如 "2025-12-22 Sunday"（会根据当前语言显示对应的星期）
 */
export function formatDate(date: Dayjs): string {
  const localeStore = useLocaleStore()
  const dayjsLocale = mapLocaleToDayjsLocale(localeStore.currentLocale)

  // 设置语言并格式化
  return date.locale(dayjsLocale).format('YYYY-MM-DD dddd')
}

/**
 * 格式化时区标签
 * @param timezoneStr IANA 时区字符串
 * @param isUTC 是否使用 UTC 标签（否则使用 GMT）
 * @param date 参考时间（用于计算偏移量），可以是 Date 或 Dayjs 对象
 * @returns 格式化后的时区标签，例如 "UTC+8" 或 "GMT+8"
 */
export function formatTimezone(timezoneStr: string, isUTC: boolean, date?: Date | Dayjs): string {
  try {
    const offset = dayjs.tz(dayjs(date), timezoneStr).utcOffset()
    const hours = Math.floor(Math.abs(offset) / 60)
    const minutes = Math.abs(offset) % 60
    const sign = offset >= 0 ? '+' : '-'
    const prefix = isUTC ? 'UTC' : 'GMT'

    if (minutes === 0) {
      return `${prefix}${sign}${hours}`
    }
    else {
      return `${prefix}${sign}${hours}:${minutes.toString().padStart(2, '0')}`
    }
  }
  catch {
    return isUTC ? 'UTC' : 'GMT'
  }
}

/**
 * 获取完整的时区显示文本
 * @param timezoneStr IANA 时区字符串
 * @param isUTC 是否使用 UTC 标签
 * @returns 完整的时区显示，例如 "Asia/Shanghai (UTC+8)"
 */
export function getTimezoneDisplay(timezoneStr: string, isUTC: boolean): string {
  const formatted = formatTimezone(timezoneStr, isUTC)
  return `${timezoneStr} (${formatted})`
}
