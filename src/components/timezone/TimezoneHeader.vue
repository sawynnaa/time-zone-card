<script setup lang="ts">
import { computed } from 'vue'
import { useTimezoneState } from './composables/useTimezoneState'
import { formatTime } from './composables/useTimezoneFormat'
import { getTimeInZone } from './composables/useTimeCalculation'
import { getCityById } from '@/data/cities'

const {
  currentTime,
  isPreviewMode,
  cards,
  resetToCurrentTime,
  toggleTimeFormat,
  toggleUTCLabel,
  timeFormat,
  activeCard,
} = useTimezoneState()

// 显示重置按钮的条件
const showResetButton = computed(() => isPreviewMode.value && cards.value.length > 1)

// 获取当前时区的时间（显示用户本地时区的当前时间）
const currentLocalTime = computed(() => {
  // 使用激活卡片的时区，如果没有则使用第一张卡片的时区
  const card = activeCard.value || cards.value[0]
  if (!card)
    return null

  const city = getCityById(card.cityId)
  if (!city)
    return null

  return getTimeInZone(currentTime.value, city.timezone)
})
</script>

<template>
  <div class="bg-white rounded-xl p-6 shadow-lg mb-8">
    <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
      <!-- 左侧：当前时间显示 -->
      <div>
        <div class="text-sm text-gray-500 mb-1">
          当前时间
        </div>
        <div v-if="currentLocalTime" class="text-3xl font-bold text-gray-900 font-mono">
          {{ formatTime(currentLocalTime, timeFormat.is24Hour) }}
        </div>
      </div>

      <!-- 右侧：控制按钮组 -->
      <div class="flex flex-wrap gap-3">
        <!-- 重置按钮 -->
        <button
          v-if="showResetButton"
          class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 font-medium shadow-md hover:shadow-lg"
          @click="resetToCurrentTime"
        >
          <div class="i-carbon-reset text-lg" />
          重置时间
        </button>

        <!-- 12/24小时制切换 -->
        <button
          class="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          @click="toggleTimeFormat"
        >
          {{ timeFormat.is24Hour ? '24小时制' : '12小时制' }}
        </button>

        <!-- UTC/GMT切换 -->
        <button
          class="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          @click="toggleUTCLabel"
        >
          {{ timeFormat.isUTC ? 'UTC' : 'GMT' }}
        </button>
      </div>
    </div>
  </div>
</template>
