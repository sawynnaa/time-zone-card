<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import Sortable from 'sortablejs'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useTimezoneStore } from '@/stores/timezoneStore'
import TimezoneHeader from './TimezoneHeader.vue'
import TimezoneCard from './TimezoneCard.vue'
import CitySelector from './CitySelector.vue'

const { t } = useI18n()

const timezoneStore = useTimezoneStore()
const { cards, existingCityIds } = storeToRefs(timezoneStore)
const { initializeCards, addCard, reorderCards, startClock, stopClock } = timezoneStore

// 网格容器（含卡片 + 添加按钮）
const cardsContainerRef = ref<HTMLElement | null>(null)
let sortableInstance: Sortable | null = null

// 城市选择器状态
const showAddCitySelector = ref(false)

// 添加新卡片
function handleAddCard(cityId: string) {
  addCard(cityId)
  showAddCitySelector.value = false
}

/**
 * 根据 DOM 中卡片的实际顺序同步到 store。
 * 容器内还有「添加」按钮，不能直接用 Sortable 的 oldIndex/newIndex。
 */
function syncCardOrderFromDom() {
  if (!cardsContainerRef.value)
    return

  const orderedIds = Array.from(cardsContainerRef.value.children)
    .filter(el => el.classList.contains('timezone-card'))
    .map(el => (el as HTMLElement).dataset.cardId)
    .filter((id): id is string => Boolean(id))

  if (orderedIds.length === 0)
    return

  const cardMap = new Map(cards.value.map(card => [card.id, card]))
  const reordered = orderedIds
    .map(id => cardMap.get(id))
    .filter((card): card is NonNullable<typeof card> => Boolean(card))

  // 防止 DOM/数据不同步时丢卡片
  if (reordered.length !== cards.value.length)
    return

  reorderCards(reordered)
}

// 初始化 Sortable
function initSortable() {
  if (!cardsContainerRef.value)
    return

  sortableInstance?.destroy()

  sortableInstance = Sortable.create(cardsContainerRef.value, {
    // 排序占位切换动画：0.3s（过长会感觉“拖到位还要等一会”）
    animation: 300,
    easing: 'cubic-bezier(0.2, 0, 0, 1)',
    handle: '.drag-handle',
    draggable: '.timezone-card',
    filter: '.add-city-btn',
    ghostClass: 'dragging-ghost',
    chosenClass: 'dragging-chosen',
    dragClass: 'dragging-drag',
    fallbackClass: 'sortable-fallback',
    forceFallback: true,
    fallbackTolerance: 0,
    fallbackOnBody: true,
    swapThreshold: 0.65,
    emptyInsertThreshold: 8,
    onStart: () => {
      cardsContainerRef.value?.classList.add('is-sorting')
    },
    onEnd: () => {
      cardsContainerRef.value?.classList.remove('is-sorting')
      syncCardOrderFromDom()
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
  sortableInstance?.destroy()
  sortableInstance = null
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
      <TimezoneCard
        v-for="card in cards"
        :key="card.id"
        :card-id="card.id"
        :data-card-id="card.id"
        class="timezone-card"
      />

      <!-- 添加卡片按钮（filter 排除，不参与排序索引） -->
      <button
        type="button"
        class="add-city-btn border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 flex flex-col items-center justify-center gap-3 group h-[300px]"
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
/* 排序过程中关闭卡片自身 CSS transition，避免与 Sortable 的 transform 动画叠成“卡 1 秒” */
:deep(.is-sorting .timezone-card) {
  transition: none !important;
}

/* 拖拽时的幽灵元素样式（占位符） */
:deep(.dragging-ghost) {
  opacity: 0.35;
  background: #e5e7eb;
  border: 2px dashed #9ca3af;
  box-shadow: none !important;
  /* 占位符不参与额外过渡 */
  transition: none !important;
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
  opacity: 0.95 !important;
  /* 注意：Sortable fallback 模式会用 inline `transform: translate3d(...)` 跟随鼠标移动；
     这里如果用 `transform: ... !important` 会覆盖掉 translate，导致拖拽元素看起来被“锁”在网格里。 */
  rotate: 2deg;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2) !important;
  cursor: grabbing !important;
  z-index: 9999 !important;
  list-style: none !important;
  transition: none !important;
  will-change: transform;
}

/* 确保卡片在拖拽时保持样式 */
:deep(.sortable-fallback > *) {
  pointer-events: none;
}
</style>
