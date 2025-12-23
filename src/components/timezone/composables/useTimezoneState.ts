import { ref, computed, watch } from 'vue'
import type { Dayjs } from 'dayjs'
import type { TimezoneCard, TimeFormat } from '@/types/timezone'
import { DEFAULT_CARD_CITIES, getCityById } from '@/data/cities'
import { dayjs } from '@/utils/timezone-helpers'

// 全局状态（单例模式）
const cards = ref<TimezoneCard[]>([])
const activeCardId = ref<string | null>(null)
const currentTime = ref<Dayjs>(dayjs())
const previewTime = ref<Dayjs | null>(null)
const timeFormat = ref<TimeFormat>({
  is24Hour: false, // 默认12小时制
  isUTC: true, // 默认使用 UTC
})

let clockInterval: number | null = null

// --- 本地存储持久化（刷新后还原卡片）---
// 版本化 key，后续结构变更时可通过升级 version 兼容旧数据
const STORAGE_KEY = 'vue-timezone:state:v1'
// 单例 composable 可能被多处引用，确保只初始化一次持久化 watch
let persistenceInitialized = false
// 从 localStorage 恢复时避免触发回写（防止“恢复->立刻覆盖”/循环）
let restoringFromStorage = false
// 批量变更（如拖拽排序）时合并多次写入，降低 localStorage 压力
let persistQueued = false

interface PersistedTimezoneStateV1 {
  version: 1
  cards: Array<Pick<TimezoneCard, 'id' | 'cityId'>>
  activeCardId: string | null
  timeFormat?: Partial<TimeFormat>
}

// SSR/无痕/禁用存储等场景下，localStorage 可能不可用
function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

// 校验并清洗持久化数据（避免结构不对/城市被移除导致报错）
function sanitizePersistedState(raw: unknown): PersistedTimezoneStateV1 | null {
  if (!raw || typeof raw !== 'object')
    return null

  const record = raw as Record<string, unknown>
  if (record.version !== 1)
    return null

  const persistedCards = record.cards
  if (!Array.isArray(persistedCards))
    return null

  const cardsSanitized: Array<Pick<TimezoneCard, 'id' | 'cityId'>> = []
  for (const item of persistedCards) {
    if (!item || typeof item !== 'object')
      continue
    const card = item as Record<string, unknown>
    if (typeof card.id !== 'string' || typeof card.cityId !== 'string')
      continue
    if (!getCityById(card.cityId))
      continue
    cardsSanitized.push({ id: card.id, cityId: card.cityId })
  }

  const activeId = typeof record.activeCardId === 'string' ? record.activeCardId : null
  const timeFormatRaw = record.timeFormat
  const timeFormatSanitized: PersistedTimezoneStateV1['timeFormat'] = {}
  if (timeFormatRaw && typeof timeFormatRaw === 'object') {
    const tf = timeFormatRaw as Record<string, unknown>
    if (typeof tf.is24Hour === 'boolean')
      timeFormatSanitized.is24Hour = tf.is24Hour
    if (typeof tf.isUTC === 'boolean')
      timeFormatSanitized.isUTC = tf.isUTC
  }

  return {
    version: 1,
    cards: cardsSanitized,
    activeCardId: activeId,
    timeFormat: timeFormatSanitized,
  }
}

// 尝试从 localStorage 恢复：成功则返回 true；失败则返回 false 继续走默认初始化
function restoreFromStorage(): boolean {
  if (!canUseStorage())
    return false

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw)
    return false

  try {
    const parsed = JSON.parse(raw) as unknown
    const sanitized = sanitizePersistedState(parsed)
    if (!sanitized || sanitized.cards.length === 0)
      return false

    restoringFromStorage = true

    // 只恢复必要字段：id/cityId；isActive 会根据 activeCardId 重新计算
    const restoredCards: TimezoneCard[] = sanitized.cards.map(c => ({
      id: c.id,
      cityId: c.cityId,
      isActive: false,
    }))

    let restoredActiveId = sanitized.activeCardId
    if (!restoredActiveId || !restoredCards.some(c => c.id === restoredActiveId))
      restoredActiveId = restoredCards[0]?.id ?? null

    restoredCards.forEach((card) => {
      card.isActive = card.id === restoredActiveId
    })

    cards.value = restoredCards
    activeCardId.value = restoredActiveId

    timeFormat.value = {
      is24Hour: sanitized.timeFormat?.is24Hour ?? timeFormat.value.is24Hour,
      isUTC: sanitized.timeFormat?.isUTC ?? timeFormat.value.isUTC,
    }

    return true
  }
  catch {
    return false
  }
  finally {
    restoringFromStorage = false
  }
}

// 写入 localStorage（忽略配额/隐私模式等异常）
function persistToStorage() {
  if (restoringFromStorage)
    return
  if (!canUseStorage())
    return

  const state: PersistedTimezoneStateV1 = {
    version: 1,
    cards: cards.value.map(({ id, cityId }) => ({ id, cityId })),
    activeCardId: activeCardId.value,
    timeFormat: {
      is24Hour: timeFormat.value.is24Hour,
      isUTC: timeFormat.value.isUTC,
    },
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }
  catch {
    // ignore quota / privacy mode errors
  }
}

// 合并短时间内多次状态变化，只在微任务里写一次 localStorage
function schedulePersist() {
  if (restoringFromStorage || persistQueued)
    return
  persistQueued = true

  const queue = typeof queueMicrotask === 'function'
    ? queueMicrotask
    : (fn: () => void) => Promise.resolve().then(fn)

  queue(() => {
    persistQueued = false
    persistToStorage()
  })
}

function setupPersistence() {
  if (persistenceInitialized)
    return
  persistenceInitialized = true

  // cards/active/timeFormat 任意变化都持久化；deep 用于捕获数组内对象字段变更
  watch(cards, schedulePersist, { deep: true, flush: 'sync' })
  watch(activeCardId, schedulePersist, { flush: 'sync' })
  watch(timeFormat, schedulePersist, { deep: true, flush: 'sync' })
}

/**
 * 时区状态管理 Composable
 */
export function useTimezoneState() {
  setupPersistence()

  // 显示的时间（当前时间或预览时间）
  const displayTime = computed(() => previewTime.value || currentTime.value)

  // 是否处于预览模式
  const isPreviewMode = computed(() => previewTime.value !== null)

  // 初始化默认卡片
  function initializeCards() {
    if (cards.value.length === 0) {
      // 1) 优先从本地存储恢复用户上次的卡片/排序/设置
      const restored = restoreFromStorage()
      if (restored)
        return

      // 2) 本地存储无数据或不合法时，才创建默认卡片
      DEFAULT_CARD_CITIES.forEach((cityId, index) => {
        const card: TimezoneCard = {
          id: `card-${Date.now()}-${index}`,
          cityId,
          isActive: index === 0, // 第一张卡片默认激活
        }
        cards.value.push(card)
      })

      // 设置第一张卡片为激活状态
      const firstCard = cards.value[0]
      if (firstCard) {
        activeCardId.value = firstCard.id
      }
    }
  }

  // 添加卡片
  function addCard(cityId: string) {
    const newCard: TimezoneCard = {
      id: `card-${Date.now()}`,
      cityId,
      isActive: false,
    }
    cards.value.push(newCard)
  }

  // 删除卡片
  function removeCard(cardId: string) {
    const index = cards.value.findIndex(c => c.id === cardId)
    if (index === -1)
      return

    const cardToRemove = cards.value[index]
    if (!cardToRemove)
      return

    const wasActive = cardToRemove.isActive

    cards.value.splice(index, 1)

    // 如果删除的是激活卡片，激活第一张卡片
    if (wasActive) {
      const firstCard = cards.value[0]
      if (firstCard) {
        setActiveCard(firstCard.id)
      }
    }
  }

  // 设置激活卡片
  function setActiveCard(cardId: string) {
    // 取消所有卡片的激活状态
    cards.value.forEach((card) => {
      card.isActive = false
    })

    // 激活指定卡片
    const card = cards.value.find(c => c.id === cardId)
    if (card) {
      card.isActive = true
      activeCardId.value = cardId
    }
  }

  // 更新卡片城市
  function updateCardCity(cardId: string, newCityId: string) {
    const card = cards.value.find(c => c.id === cardId)
    if (card) {
      card.cityId = newCityId
    }
  }

  // 重新排序卡片
  function reorderCards(newOrder: TimezoneCard[]) {
    cards.value = newOrder
  }

  // 根据索引重新排序卡片
  function moveCard(oldIndex: number, newIndex: number) {
    if (oldIndex === newIndex)
      return

    const cardsCopy = [...cards.value]
    const [movedCard] = cardsCopy.splice(oldIndex, 1)
    if (movedCard) {
      cardsCopy.splice(newIndex, 0, movedCard)
      cards.value = cardsCopy
    }
  }

  // 设置预览时间
  function setPreviewTime(time: Dayjs | null) {
    previewTime.value = time
  }

  // 重置到当前时间
  function resetToCurrentTime() {
    previewTime.value = null
  }

  // 切换时间格式（12/24小时制）
  function toggleTimeFormat() {
    timeFormat.value.is24Hour = !timeFormat.value.is24Hour
  }

  // 切换 UTC/GMT 标签
  function toggleUTCLabel() {
    timeFormat.value.isUTC = !timeFormat.value.isUTC
  }

  // 启动时钟
  function startClock() {
    // 先清除已有的定时器
    if (clockInterval !== null) {
      clearInterval(clockInterval)
    }

    // 立即更新一次
    currentTime.value = dayjs()

    // 每秒更新一次
    clockInterval = window.setInterval(() => {
      currentTime.value = dayjs()
    }, 1000)
  }

  // 停止时钟
  function stopClock() {
    if (clockInterval !== null) {
      clearInterval(clockInterval)
      clockInterval = null
    }
  }

  // 获取激活的卡片
  const activeCard = computed(() => {
    return cards.value.find(c => c.id === activeCardId.value)
  })

  return {
    // 状态
    cards,
    activeCardId,
    currentTime,
    previewTime,
    displayTime,
    timeFormat,
    isPreviewMode,
    activeCard,

    // 方法
    initializeCards,
    addCard,
    removeCard,
    setActiveCard,
    updateCardCity,
    reorderCards,
    moveCard,
    setPreviewTime,
    resetToCurrentTime,
    toggleTimeFormat,
    toggleUTCLabel,
    startClock,
    stopClock,
  }
}
