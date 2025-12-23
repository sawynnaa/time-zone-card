<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Dayjs } from 'dayjs'
import type { TimezoneCard } from '@/types/timezone'
import { useI18n } from 'vue-i18n'
import { getCityById } from '@/data/cities'
import { useTimezoneState } from './composables/useTimezoneState'
import { useCityTranslation } from '@/composables/useCityTranslation'
import { getTimeInZone } from './composables/useTimeCalculation'
import { formatTime, formatDate, formatTimezone } from './composables/useTimezoneFormat'
import { getTimeDifference, formatTimeDifference } from './composables/useTimeDifference'
import CardTimelineSlider from './CardTimelineSlider.vue'
import CitySelector from './CitySelector.vue'

const { t } = useI18n()
const { getCityName, getCountryName } = useCityTranslation()

interface Props {
  card: TimezoneCard
  isActive: boolean
  showClose: boolean
}

const props = defineProps<Props>()

const { displayTime, timeFormat, setActiveCard, removeCard, updateCardCity, activeCard, cards, setPreviewTime } = useTimezoneState()

// 控制是否正在拖拽
const isDragging = ref(false)

// 已添加的城市 ID 列表（排除当前卡片）
const existingCityIds = computed(() => {
  return cards.value
    .filter(c => c.id !== props.card.id)
    .map(c => c.cityId)
})

// 获取城市信息
const city = computed(() => getCityById(props.card.cityId))

// 计算该卡片时区的时间
const cardTime = computed(() => {
  if (!city.value)
    return null
  return getTimeInZone(displayTime.value, city.value.timezone)
})

// 计算与激活卡片的时差
const timeDiff = computed(() => {
  if (props.isActive || !activeCard.value || !city.value)
    return null

  const activeCity = getCityById(activeCard.value.cityId)
  if (!activeCity)
    return null

  const diffMinutes = getTimeDifference(
    activeCity.timezone,
    city.value.timezone,
    displayTime.value,
  )

  return formatTimeDifference(diffMinutes)
})

// 切换激活状态
function toggleActive() {
  if (!props.isActive && !isDragging.value) {
    setActiveCard(props.card.id)
  }
}

// 处理 mousedown 事件
function handleMouseDown() {
  isDragging.value = false

  setTimeout(() => {
    if (!isDragging.value) {
      toggleActive()
    }
  }, 100)
}

// 拖拽开始时设置拖拽标志
function handleDragStart() {
  isDragging.value = true
}

// 删除卡片
function handleRemove() {
  removeCard(props.card.id)
}

// 城市选择器
const showCitySelector = ref(false)

function handleEditCity() {
  showCitySelector.value = true
}

function handleCitySelect(cityId: string) {
  updateCardCity(props.card.id, cityId)
  showCitySelector.value = false
}

// 处理滑块时间更新
function handleSliderUpdate(newTime: Dayjs) {
  setPreviewTime(newTime)
}
</script>

<template>
  <div
    :class="[
      'rounded-xl p-6 transition-all duration-300 select-none h-[300px]',
      isActive
        ? 'bg-gray-900 text-white shadow-2xl '
        : 'bg-white text-gray-900 shadow-md hover:shadow-lg border border-gray-200',
    ]"
    @mousedown="handleMouseDown"
  >
    <!-- 头部：城市信息 + 按钮 -->
    <div class="flex justify-between items-start mb-4">
      <div class="flex-1">
        <h3 class="text-2xl font-bold">
          {{ city ? getCityName(city.id) : t('card.unknownCity') }}
        </h3>
        <p :class="['text-sm mt-1', isActive ? 'opacity-70' : 'opacity-60']">
          {{ city ? getCountryName(city.country) : t('card.unknownCountry') }}
        </p>
        <p :class="['text-xs mt-1', isActive ? 'opacity-50' : 'opacity-40']">
          {{ city ? formatTimezone(city.timezone, timeFormat.isUTC) : '' }}
        </p>
      </div>

      <!-- 按钮组 -->
      <div class="flex gap-2" @click.stop>
        <!-- 拖拽手柄按钮 -->
        <div
          class="drag-handle cursor-grab active:cursor-grabbing text-xl transition-colors duration-200"
          :class="isActive ? 'text-white hover:text-blue-300' : 'text-gray-400 hover:text-blue-500'"
          @mousedown.stop="handleDragStart"
          :title="t('card.dragToSort')"
        >
          <div class="i-carbon-draggable" />
        </div>

        <!-- 编辑按钮 -->
        <div
          class="cursor-pointer text-xl transition-colors duration-200"
          :class="isActive ? 'text-white hover:text-blue-300' : 'text-gray-600 hover:text-blue-500'"
          @click="handleEditCity"
          :title="t('card.editCity')"
        >
          <div class="i-carbon-edit" />
        </div>

        <!-- 关闭按钮 -->
        <div
          v-if="showClose"
          class="cursor-pointer text-xl transition-colors duration-200"
          :class="isActive ? 'text-white hover:text-red-300' : 'text-gray-600 hover:text-red-500'"
          @click="handleRemove"
          :title="t('card.deleteCard')"
        >
          <div class="i-carbon-close" />
        </div>
      </div>
    </div>

    <!-- 时差标签（非激活卡片） -->
    <div :class="['text-sm mb-3 font-medium', isActive ? 'opacity-70' : 'text-blue-600']">
      <span v-if="timeDiff">{{ t('card.timeDiff') }}: {{ timeDiff }}</span>
      <span v-else>&nbsp;</span>
    </div>

    <!-- 日期和时间显示 -->
    <div v-if="cardTime" class="mb-6">
      <div :class="['text-sm mb-1', isActive ? 'opacity-70' : 'opacity-60']">
        {{ formatDate(cardTime) }}
      </div>
      <div class="text-5xl font-bold font-mono">
        {{ formatTime(cardTime, timeFormat.is24Hour) }}
      </div>
    </div>

    <!-- 时间轴滑块 -->
    <CardTimelineSlider
      v-if="city"
      :timezone="city.timezone"
      :is-active="isActive"
      :display-time="displayTime"
      :time-format="timeFormat"
      @update-time="handleSliderUpdate"
    />

    <!-- 城市选择器模态框 -->
    <CitySelector
      :show="showCitySelector"
      :existing-city-ids="existingCityIds"
      @select="handleCitySelect"
      @close="showCitySelector = false"
    />
  </div>
</template>

<style scoped>
/* 拖拽手柄的悬停效果 */
.drag-handle {
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.drag-handle:active {
  opacity: 0.7;
}
</style>
