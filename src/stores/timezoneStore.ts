import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Dayjs } from 'dayjs'
import type { TimezoneCard, TimeFormat } from '@/types/timezone'
import { DEFAULT_CARD_CITIES, getCityById } from '@/data/cities'
import { dayjs } from '@/utils/timezone-helpers'

export const useTimezoneStore = defineStore('timezone', () => {
  // ============ State ============
  const cards = ref<TimezoneCard[]>([])
  const activeCardId = ref<string | null>(null)
  const currentTime = ref<Dayjs>(dayjs())
  const previewTime = ref<Dayjs | null>(null)
  const timeFormat = ref<TimeFormat>({
    is24Hour: true,
    isUTC: true,
  })

  // Clock interval management (not persisted)
  let clockInterval: number | null = null

  // ============ Getters ============
  const displayTime = computed(() => previewTime.value || currentTime.value)
  const isPreviewMode = computed(() => previewTime.value !== null)
  const activeCard = computed(() =>
    cards.value.find(c => c.id === activeCardId.value),
  )

  // Shared computed for existingCityIds (replaces duplicated logic in components)
  const existingCityIds = computed(() =>
    cards.value.map(card => card.cityId),
  )

  // ============ Actions ============

  // Initialization
  function initializeCards() {
    if (cards.value.length === 0) {
      // Create default cards (restoration handled by persistence plugin)
      DEFAULT_CARD_CITIES.forEach((cityId, index) => {
        const card: TimezoneCard = {
          id: `card-${Date.now()}-${index}`,
          cityId,
          isActive: index === 0,
        }
        cards.value.push(card)
      })

      const firstCard = cards.value[0]
      if (firstCard) {
        activeCardId.value = firstCard.id
      }
    }
  }

  // Card management
  function addCard(cityId: string) {
    const newCard: TimezoneCard = {
      id: `card-${Date.now()}`,
      cityId,
      isActive: false,
    }
    cards.value.push(newCard)
  }

  function removeCard(cardId: string) {
    const index = cards.value.findIndex(c => c.id === cardId)
    if (index === -1)
      return

    const cardToRemove = cards.value[index]
    if (!cardToRemove)
      return

    const wasActive = cardToRemove.isActive

    cards.value.splice(index, 1)

    // If deleted card was active, activate first card
    if (wasActive) {
      const firstCard = cards.value[0]
      if (firstCard) {
        setActiveCard(firstCard.id)
      }
    }
  }

  function setActiveCard(cardId: string) {
    // Deactivate all cards
    cards.value.forEach((card) => {
      card.isActive = false
    })

    // Activate specified card
    const card = cards.value.find(c => c.id === cardId)
    if (card) {
      card.isActive = true
      activeCardId.value = cardId
    }
  }

  function updateCardCity(cardId: string, newCityId: string) {
    const card = cards.value.find(c => c.id === cardId)
    if (card) {
      card.cityId = newCityId
    }
  }

  function reorderCards(newOrder: TimezoneCard[]) {
    cards.value = newOrder
  }

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

  // Time management
  function setPreviewTime(time: Dayjs | null) {
    previewTime.value = time
  }

  function resetToCurrentTime() {
    previewTime.value = null
  }

  // Time format toggles
  function toggleTimeFormat() {
    timeFormat.value.is24Hour = !timeFormat.value.is24Hour
  }

  function toggleUTCLabel() {
    timeFormat.value.isUTC = !timeFormat.value.isUTC
  }

  // Clock management
  function startClock() {
    if (clockInterval !== null) {
      clearInterval(clockInterval)
    }

    currentTime.value = dayjs()

    clockInterval = window.setInterval(() => {
      currentTime.value = dayjs()
    }, 1000)
  }

  function stopClock() {
    if (clockInterval !== null) {
      clearInterval(clockInterval)
      clockInterval = null
    }
  }

  return {
    // State
    cards,
    activeCardId,
    currentTime,
    previewTime,
    timeFormat,

    // Getters
    displayTime,
    isPreviewMode,
    activeCard,
    existingCityIds,

    // Actions
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
}, {
  persist: {
    key: 'vue-timezone:state:v1',
    storage: localStorage,
    pick: ['cards', 'activeCardId', 'timeFormat'],
    serializer: {
      deserialize: (value: string) => {
        try {
          const parsed = JSON.parse(value)

          // Validate version
          if (parsed.version !== 1)
            return {}

          // Sanitize cards data
          if (!Array.isArray(parsed.cards))
            return {}

          const sanitizedCards: TimezoneCard[] = []
          for (const card of parsed.cards) {
            if (!card || typeof card !== 'object')
              continue
            if (typeof card.id !== 'string' || typeof card.cityId !== 'string')
              continue
            if (!getCityById(card.cityId))
              continue // Skip removed cities

            sanitizedCards.push({
              id: card.id,
              cityId: card.cityId,
              isActive: false, // Will be set based on activeCardId
            })
          }

          if (sanitizedCards.length === 0)
            return {}

          // Validate and sanitize activeCardId
          let sanitizedActiveId = parsed.activeCardId
          if (!sanitizedActiveId || !sanitizedCards.some(c => c.id === sanitizedActiveId)) {
            sanitizedActiveId = sanitizedCards[0]?.id ?? null
          }

          // Set isActive based on activeCardId
          sanitizedCards.forEach((card) => {
            card.isActive = card.id === sanitizedActiveId
          })

          // Sanitize timeFormat
          const timeFormatSanitized: TimeFormat = {
            is24Hour: typeof parsed.timeFormat?.is24Hour === 'boolean'
              ? parsed.timeFormat.is24Hour
              : true,
            isUTC: typeof parsed.timeFormat?.isUTC === 'boolean'
              ? parsed.timeFormat.isUTC
              : true,
          }

          return {
            cards: sanitizedCards,
            activeCardId: sanitizedActiveId,
            timeFormat: timeFormatSanitized,
          }
        }
        catch {
          return {}
        }
      },
      serialize: (state: any) => {
        const persistedState = {
          version: 1,
          cards: state.cards.map(({ id, cityId }: TimezoneCard) => ({ id, cityId })),
          activeCardId: state.activeCardId,
          timeFormat: {
            is24Hour: state.timeFormat.is24Hour,
            isUTC: state.timeFormat.isUTC,
          },
        }
        return JSON.stringify(persistedState)
      },
    },
  },
})
