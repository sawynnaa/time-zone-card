<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import Sortable from 'sortablejs'
import { useI18n } from 'vue-i18n'
import { useTimezoneState } from './composables/useTimezoneState'
import TimezoneHeader from './TimezoneHeader.vue'
import TimezoneCard from './TimezoneCard.vue'
import CitySelector from './CitySelector.vue'

const { t } = useI18n()

const {
  cards,
  activeCardId,
  initializeCards,
  addCard,
  startClock,
  stopClock,
} = useTimezoneState()

// 卡片容器引用
const cardsContainerRef = ref<HTMLElement | null>(null)

// 城市选择器状态
const showAddCitySelector = ref(false)

// 已添加的城市 ID 列表
const existingCityIds = computed(() => {
  return cards.value.map(card => card.cityId)
})

// 添加新卡片
function handleAddCard(cityId: string) {
  addCard(cityId)
  showAddCitySelector.value = false
}

// 初始化 Sortable
function initSortable() {
  if (!cardsContainerRef.value) return

  Sortable.create(cardsContainerRef.value, {
    animation: 300,
    handle: '.drag-handle',
    draggable: '.timezone-card', // 只允许拖拽带有 timezone-card 类的元素
    ghostClass: 'dragging-ghost',
    chosenClass: 'dragging-chosen',
    dragClass: 'dragging-drag',
    fallbackClass: 'sortable-fallback',
    forceFallback: true,
    fallbackTolerance: 0,
    fallbackOnBody: true,
    swapThreshold: 0.65,
    onEnd: (evt) => {
      const { oldIndex, newIndex } = evt
      if (oldIndex !== undefined && newIndex !== undefined && oldIndex !== newIndex) {
        const newCards = [...cards.value]
        const movedCard = newCards.splice(oldIndex, 1)[0]
        if (movedCard) {
          newCards.splice(newIndex, 0, movedCard)
          cards.value = newCards
        }
      }
    },
  })
}

// 生命周期
onMounted(async () => {
  initializeCards()
  startClock()
  await nextTick()
  initSortable()
})

onUnmounted(() => {
  stopClock()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-4 md:p-8">
    <!-- 页头 -->
    <TimezoneHeader />

    <!-- 卡片网格 -->
    <div
      ref="cardsContainerRef"
      class="grid gap-6"
      style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));"
    >
      <!-- 时区卡片 -->
      <TimezoneCard
        v-for="card in cards"
        :key="card.id"
        :card="card"
        :is-active="card.id === activeCardId"
        :show-close="cards.length > 1"
        :data-card-id="card.id"
        class="timezone-card"
      />

      <!-- 添加卡片按钮 -->
      <button
        class="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 flex flex-col items-center justify-center gap-3 group h-[300px]"
        @click="showAddCitySelector = true"
      >
        <div class="i-carbon-add text-6xl text-gray-400 group-hover:text-blue-500 transition-colors" />
        <span class="text-gray-500 group-hover:text-blue-600 font-medium transition-colors">
          {{ t('citySelector.addCity') }}
        </span>
      </button>
    </div>

    <!-- 添加城市选择器 -->
    <CitySelector
      :show="showAddCitySelector"
      :existing-city-ids="existingCityIds"
      @select="handleAddCard"
      @close="showAddCitySelector = false"
    />
  </div>
</template>

<style scoped>
/* 拖拽时的幽灵元素样式（占位符） */
:deep(.dragging-ghost) {
  opacity: 0.3;
  background: #e5e7eb;
  border: 2px dashed #9ca3af;
}

/* 被选中准备拖拽的元素 */
:deep(.dragging-chosen) {
  cursor: grabbing !important;
}

/* 拖拽中的元素样式（原生模式） */
:deep(.dragging-drag) {
  opacity: 0;
}

/* Fallback 拖拽元素样式（关键：这个会在 body 上自由移动） */
:deep(.sortable-fallback) {
  opacity: 0.9 !important;
  /* 注意：Sortable fallback 模式会用 inline `transform: translate3d(...)` 跟随鼠标移动；
     这里如果用 `transform: ... !important` 会覆盖掉 translate，导致拖拽元素看起来被“锁”在网格里。 */
  rotate: 2deg;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2) !important;
  cursor: grabbing !important;
  z-index: 9999 !important;
  list-style: none !important;
}

/* 确保卡片在拖拽时保持样式 */
:deep(.sortable-fallback > *) {
  pointer-events: none;
}
</style>
