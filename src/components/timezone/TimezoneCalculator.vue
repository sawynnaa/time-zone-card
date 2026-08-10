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
const { initializeCards, addCard, moveCard, startClock, stopClock } = timezoneStore

// 网格容器（含卡片 + 添加按钮）
const cardsContainerRef = ref<HTMLElement | null>(null)
let sortableInstance: Sortable | null = null
/** 松手后延迟恢复 transition 的 rAF id，避免与 Vue patch 抢帧 */
let settleRafId = 0

// 城市选择器状态
const showAddCitySelector = ref(false)

// 添加新卡片
function handleAddCard(cityId: string) {
  addCard(cityId)
  showAddCitySelector.value = false
}

/**
 * 立刻清掉 Sortable 残留的 inline 样式。
 * 否则松手后 transform/transition 还在，会等下一帧甚至下一次整表重绘才「回正」，
 * 叠上 1s 时钟刷新时体感特别像卡了一拍。
 */
function clearSortableInlineStyles(container: HTMLElement, dragItem?: HTMLElement | null) {
  const nodes = new Set<HTMLElement>()
  for (const node of Array.from(container.children)) {
    if (node instanceof HTMLElement)
      nodes.add(node)
  }
  if (dragItem)
    nodes.add(dragItem)

  for (const node of nodes) {
    // 先锁死 transition，再清 transform，避免「缓动回正」
    node.style.setProperty('transition', 'none', 'important')
    node.style.removeProperty('transform')
    node.style.removeProperty('webkitTransform')
    node.style.removeProperty('mozTransform')
    node.style.removeProperty('msTransform')
    node.style.removeProperty('will-change')
    node.style.removeProperty('z-index')
    node.style.removeProperty('opacity')
    node.style.removeProperty('position')
    node.style.removeProperty('left')
    node.style.removeProperty('top')
    node.style.removeProperty('width')
    node.style.removeProperty('height')
    node.style.removeProperty('pointer-events')
    node.style.removeProperty('box-sizing')
    node.style.removeProperty('margin')
  }

  // 强制一次 reflow，让上面的「无 transition + 无 transform」立即生效
  void container.offsetHeight
}

/** 等 Vue patch 完 + 浏览器画完一帧，再恢复卡片自身的 hover/主题 transition */
function releaseSortingLock(container: HTMLElement) {
  if (settleRafId) {
    cancelAnimationFrame(settleRafId)
    settleRafId = 0
  }

  nextTick(() => {
    clearSortableInlineStyles(container)
    // 双 rAF：保证本帧布局已提交后再开 transition，避免松手那一帧又被 duration-300 拖住
    settleRafId = requestAnimationFrame(() => {
      settleRafId = requestAnimationFrame(() => {
        settleRafId = 0
        for (const node of Array.from(container.children)) {
          if (node instanceof HTMLElement)
            node.style.removeProperty('transition')
        }
        container.classList.remove('is-sorting')
      })
    })
  })
}

// 初始化 Sortable
function initSortable() {
  if (!cardsContainerRef.value)
    return

  sortableInstance?.destroy()

  const container = cardsContainerRef.value

  sortableInstance = Sortable.create(container, {
    // 0 = 换位/回正都不做 JS 动画，松手瞬时贴位
    animation: 0,
    handle: '.drag-handle',
    draggable: '.timezone-card',
    filter: '.add-city-btn',
    preventOnFilter: true,
    ghostClass: 'dragging-ghost',
    chosenClass: 'dragging-chosen',
    dragClass: 'dragging-drag',
    fallbackClass: 'sortable-fallback',
    forceFallback: true,
    fallbackOnBody: true,
    fallbackTolerance: 3,
    swapThreshold: 0.65,
    emptyInsertThreshold: 8,
    // 拖拽过程中不触发浏览器原生拖影，只用我们的 fallback 克隆
    setData(dataTransfer) {
      dataTransfer.setData('text', '')
    },
    onStart: () => {
      if (settleRafId) {
        cancelAnimationFrame(settleRafId)
        settleRafId = 0
      }
      container.classList.add('is-sorting')
    },
    onEnd: (evt) => {
      const { oldDraggableIndex, newDraggableIndex, item } = evt

      // 1) 同步清样式：在 Sortable 刚卸掉 ghost/clone 的同一调用栈里贴位
      clearSortableInlineStyles(container, item as HTMLElement)

      // 2) 同步数据（Sortable 已改 DOM；store 跟上，避免下次时钟 tick 把顺序打回）
      if (
        oldDraggableIndex != null
        && newDraggableIndex != null
        && oldDraggableIndex !== newDraggableIndex
      ) {
        moveCard(oldDraggableIndex, newDraggableIndex)
      }

      // 3) Vue patch 完成后再解锁 transition
      releaseSortingLock(container)
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
  if (settleRafId) {
    cancelAnimationFrame(settleRafId)
    settleRafId = 0
  }
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
/*
 * 排序期间彻底关掉卡片 transition。
 * 卡片本身有 duration-300（背景/阴影等）；若松手时还开着，
 * ghost→实体 的样式切换会像「拖完还要等一会才回正」。
 */
:deep(.is-sorting .timezone-card),
:deep(.is-sorting .timezone-card *),
:deep(.is-sorting .add-city-btn) {
  transition: none !important;
  animation: none !important;
}

/*
 * 占位符：只占位、几乎不抢视觉。
 * 跟手的是 body 上的 fallback 克隆；松手克隆一删，实体卡已在槽位里，无需再「飞回去」。
 */
:deep(.dragging-ghost) {
  opacity: 0 !important;
  background: transparent !important;
  border: 2px dashed transparent !important;
  box-shadow: none !important;
  transition: none !important;
  transform: none !important;
  pointer-events: none !important;
}

:deep(.dragging-chosen) {
  cursor: grabbing !important;
}

/* 原生拖镜像（forceFallback 时几乎用不到） */
:deep(.dragging-drag) {
  opacity: 0;
}

/*
 * body 上的跟手克隆：禁止任何 transition。
 * 不要写 transform/rotate（会盖掉 Sortable 的 translate3d 跟手）。
 */
:deep(.sortable-fallback) {
  opacity: 0.96 !important;
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.18) !important;
  cursor: grabbing !important;
  z-index: 9999 !important;
  list-style: none !important;
  transition: none !important;
  animation: none !important;
  pointer-events: none !important;
}

:deep(.sortable-fallback > *) {
  pointer-events: none;
  transition: none !important;
}
</style>
