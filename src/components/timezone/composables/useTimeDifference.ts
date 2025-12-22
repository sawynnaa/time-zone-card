import type { Dayjs } from 'dayjs'
import { dayjs } from '@/utils/timezone-helpers'

/**
 * 计算两个时区之间的时差（分钟）
 * @param timezone1 第一个时区
 * @param timezone2 第二个时区
 * @param refTime 参考时间（可以是 Date 或 Dayjs 对象）
 * @returns 时差（分钟），正数表示 timezone2 比 timezone1 快
 */
export function getTimeDifference(
  timezone1: string,
  timezone2: string,
  refTime?: Date | Dayjs,
): number {
  try {
    const time1 = dayjs.tz(dayjs(refTime), timezone1)
    const time2 = dayjs.tz(dayjs(refTime), timezone2)

    const offset1 = time1.utcOffset()
    const offset2 = time2.utcOffset()

    return offset2 - offset1
  }
  catch {
    return 0
  }
}

/**
 * 格式化时差显示（中文）
 * @param diffMinutes 时差（分钟）
 * @returns 格式化的时差字符串，例如 "+3小时", "-5.5小时", "+30分钟"
 */
export function formatTimeDifference(diffMinutes: number): string {
  if (diffMinutes === 0) {
    return '相同时区'
  }

  const sign = diffMinutes > 0 ? '+' : '-'
  const absDiff = Math.abs(diffMinutes)

  const hours = Math.floor(absDiff / 60)
  const minutes = absDiff % 60

  if (hours === 0) {
    return `${sign}${minutes}分钟`
  }

  if (minutes === 0) {
    return `${sign}${hours}小时`
  }

  // 如果有小数小时（如 5.5 小时）
  const decimalHours = absDiff / 60
  return `${sign}${decimalHours.toFixed(1)}小时`
}

/**
 * 获取简洁的时差显示（仅数字）
 * @param diffMinutes 时差（分钟）
 * @returns 简洁的时差字符串，例如 "+3h", "-5.5h"
 */
export function formatTimeDifferenceShort(diffMinutes: number): string {
  if (diffMinutes === 0) {
    return '0h'
  }

  const sign = diffMinutes > 0 ? '+' : '-'
  const absDiff = Math.abs(diffMinutes)
  const hours = absDiff / 60

  return `${sign}${hours.toFixed(1).replace(/\.0$/, '')}h`
}
