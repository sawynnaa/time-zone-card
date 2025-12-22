import { ref, computed } from 'vue'
import type { Dayjs } from 'dayjs'
import type { TimezoneCard, TimeFormat } from '@/types/timezone'
import { DEFAULT_CARD_CITIES } from '@/data/cities'
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

/**
 * 时区状态管理 Composable
 */
export function useTimezoneState() {
  // 显示的时间（当前时间或预览时间）
  const displayTime = computed(() => previewTime.value || currentTime.value)

  // 是否处于预览模式
  const isPreviewMode = computed(() => previewTime.value !== null)

  // 初始化默认卡片
  function initializeCards() {
    if (cards.value.length === 0) {
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
