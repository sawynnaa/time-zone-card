import type { Dayjs } from 'dayjs'
import { dayjs } from '@/utils/timezone-helpers'

/**
 * 获取指定时区的当前时间
 * @param timezoneStr IANA 时区字符串
 * @returns Dayjs 对象
 */
export function getCurrentTimeInZone(timezoneStr: string): Dayjs {
  return dayjs.tz(dayjs(), timezoneStr)
}

/**
 * 获取指定时间在指定时区的显示
 * @param date Date 对象或 Dayjs 对象
 * @param timezoneStr IANA 时区字符串
 * @returns Dayjs 对象
 */
export function getTimeInZone(date: Date | Dayjs, timezoneStr: string): Dayjs {
  return dayjs.tz(dayjs(date), timezoneStr)
}

/**
 * 将时间转换为滑块值 (0-95)
 * 24小时 = 1440分钟 = 96个15分钟间隔
 * @param date Date 对象或 Dayjs 对象
 * @returns 滑块值 (0-95)
 */
export function timeToSliderValue(date: Date | Dayjs): number {
  const dayjsObj = dayjs.isDayjs(date) ? date : dayjs(date)
  const hours = dayjsObj.hour()
  const minutes = dayjsObj.minute()
  const totalMinutes = hours * 60 + minutes
  return Math.floor(totalMinutes / 15)
}

/**
 * 将滑块值转换为时间
 * @param value 滑块值 (0-95)
 * @param baseDate 基准日期（保留日期部分），可以是 Date 或 Dayjs
 * @returns Dayjs 对象
 */
export function sliderValueToTime(value: number, baseDate?: Date | Dayjs): Dayjs {
  const totalMinutes = value * 15
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return dayjs(baseDate)
    .hour(hours)
    .minute(minutes)
    .second(0)
    .millisecond(0)
}

/**
 * 将时间四舍五入到最接近的间隔
 * @param date Date 对象或 Dayjs 对象
 * @param intervalMinutes 间隔分钟数（默认15分钟）
 * @returns Dayjs 对象
 */
export function roundToNearestInterval(date: Date | Dayjs, intervalMinutes: number = 15): Dayjs {
  const dayjsObj = dayjs(date)
  const minutes = dayjsObj.minute()
  const roundedMinutes = Math.round(minutes / intervalMinutes) * intervalMinutes

  return dayjsObj
    .minute(roundedMinutes)
    .second(0)
    .millisecond(0)
}

/**
 * 获取时间轴的小时标记
 * @param is24Hour 是否为24小时制
 * @returns 小时数组 - 12小时制: [12, 6, 12, 6, 12], 24小时制: [0, 6, 12, 18, 0]
 */
export function getTimelineHourMarkers(is24Hour: boolean): number[] {
  return is24Hour ? [0, 6, 12, 18, 0] : [12, 6, 12, 6, 12]
}

/**
 * 计算当前时间在时间轴上的位置百分比
 * @param date Date 对象或 Dayjs 对象
 * @returns 百分比 (0-100)
 */
export function getTimelinePosition(date: Date | Dayjs): number {
  const dayjsObj = dayjs(date)
  const hours = dayjsObj.hour()
  const minutes = dayjsObj.minute()
  const totalMinutes = hours * 60 + minutes
  return (totalMinutes / 1440) * 100 // 1440 = 24 * 60
}
