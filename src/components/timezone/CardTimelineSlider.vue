<script setup lang="ts">
import { computed } from 'vue'
import type { Dayjs } from 'dayjs'
import { timeToSliderValue, sliderValueToTime, getTimelineHourMarkers, getTimelinePosition, getTimeInZone } from './composables/useTimeCalculation'
import { dayjs } from '@/utils/timezone-helpers'

interface Props {
  timezone: string
  isActive: boolean
  displayTime: Dayjs
  timeFormat: {
    is24Hour: boolean
    isUTC: boolean
  }
}

const props = defineProps<Props>()
const emit = defineEmits<{
  updateTime: [time: Dayjs]
}>()

// 计算该时区的本地时间
const localTime = computed(() => {
  return getTimeInZone(props.displayTime, props.timezone)
})

// 滑块值 (0-95)，基于本地时间
const sliderValue = computed({
  get: () => {
    return timeToSliderValue(localTime.value)
  },
  set: (value: number) => {
    if (!props.isActive) return

    // 将滑块值转换为本地时间（保留日期）
    const newLocalTime = sliderValueToTime(value, localTime.value)

    // 将本地时间转换为全局时间
    const globalTime = dayjs.tz(
      newLocalTime.format('YYYY-MM-DD HH:mm:ss'),
      props.timezone,
    )

    emit('updateTime', globalTime)
  },
})

// 小时标记
const hourMarkers = computed(() => getTimelineHourMarkers(props.timeFormat.is24Hour))

// 预览时间位置百分比（基于本地时间）
const previewTimePosition = computed(() => {
  return getTimelinePosition(localTime.value)
})
</script>

<template>
  <div class="relative mt-4">
    <!-- 小时标记 -->
    <div class="flex justify-between text-xs opacity-50 mb-2 px-1">
      <span v-for="(hour, index) in hourMarkers" :key="index">
        {{ hour }}:00
      </span>
    </div>

    <!-- 滑块容器 -->
    <div class="relative">
      <!-- 轨道背景 -->
      <div class="h-2 bg-gray-300 rounded-full relative overflow-visible">
        <!-- 预览滑块（蓝色圆点） -->
        <div
          class="absolute z-20 pointer-events-none transition-all duration-100"
          :style="{ left: `${previewTimePosition}%` }"
        >
          <!-- 圆形滑块 -->
          <div
            :class="[
              'absolute w-4 h-4 rounded-full border-2 border-white shadow-lg transition-all',
              isActive ? 'bg-blue-500' : 'bg-blue-400 opacity-70',
            ]"
            :style="{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -25%)',
            }"
          />
        </div>

        <!-- 实际的 range input（透明覆盖） -->
        <input
          v-model.number="sliderValue"
          type="range"
          min="0"
          max="95"
          step="1"
          :disabled="!isActive"
          :class="[
            'absolute inset-0 w-full h-full opacity-0 z-30',
            isActive ? 'cursor-grab active:cursor-grabbing' : 'cursor-default pointer-events-none',
          ]"
        >
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 自定义 range input 样式 */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: transparent;
  cursor: inherit;
  border-radius: 50%;
}

input[type="range"]::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: transparent;
  cursor: inherit;
  border-radius: 50%;
  border: none;
}

input[type="range"]:focus {
  outline: none;
}

input[type="range"]:disabled {
  cursor: default;
}
</style>
