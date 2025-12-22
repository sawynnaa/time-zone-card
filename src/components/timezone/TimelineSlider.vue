<script setup lang="ts">
import { computed } from 'vue'
import { useTimezoneState } from './composables/useTimezoneState'
import { timeToSliderValue, sliderValueToTime, getTimelineHourMarkers, getTimelinePosition } from './composables/useTimeCalculation'

const { displayTime, currentTime, setPreviewTime, timeFormat } = useTimezoneState()

// 滑块值 (0-95)
const sliderValue = computed({
  get: () => {
    return timeToSliderValue(displayTime.value)
  },
  set: (value: number) => {
    const newTime = sliderValueToTime(value, currentTime.value)
    setPreviewTime(newTime)
  },
})

// 小时标记
const hourMarkers = computed(() => getTimelineHourMarkers(timeFormat.value.is24Hour))

// 预览时间位置百分比
const previewTimePosition = computed(() => {
  return getTimelinePosition(displayTime.value)
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
          class="absolute z-20 pointer-events-none"
          :style="{ left: `${previewTimePosition}%` }"
        >
          <!-- 圆形滑块 -->
          <div
            class="absolute w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg"
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
          class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
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
  cursor: pointer;
  border-radius: 50%;
}

input[type="range"]::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: transparent;
  cursor: pointer;
  border-radius: 50%;
  border: none;
}

input[type="range"]:focus {
  outline: none;
}
</style>
