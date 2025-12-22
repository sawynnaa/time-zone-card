import type { Dayjs } from 'dayjs'

// 时区城市数据结构
export interface TimezoneCity {
  id: string // 唯一标识符
  city: string // 城市名（中文）
  country: string // 国家名（中文）
  timezone: string // IANA 时区标识（例如：'Asia/Shanghai'）
  offset: number // UTC 偏移量（分钟）用于排序
  commonCity: boolean // 是否为常用城市
}

// 时区卡片数据结构
export interface TimezoneCard {
  id: string // 唯一卡片ID
  cityId: string // 引用的城市ID
  isActive: boolean // 是否为激活状态（深色模式）
}

// 时间格式配置
export interface TimeFormat {
  is24Hour: boolean // 12小时制 vs 24小时制
  isUTC: boolean // UTC vs GMT 标签
}

// 应用状态
export interface AppState {
  cards: TimezoneCard[] // 卡片列表
  activeCardId: string | null // 激活的卡片ID
  previewTime: Dayjs | null // 预览时间（null = 当前时间，Dayjs = 预览模式）
  timeFormat: TimeFormat // 时间格式配置
}
