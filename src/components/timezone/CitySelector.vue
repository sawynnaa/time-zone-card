<script setup lang="ts">
import { ref, computed } from 'vue'
import { COMMON_CITIES, ALL_TIMEZONES } from '@/data/cities'

interface Props {
  show: boolean
  existingCityIds?: string[]
}

interface Emits {
  (e: 'select', cityId: string): void
  (e: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  existingCityIds: () => [],
})
const emit = defineEmits<Emits>()

const searchQuery = ref('')

// 过滤后的城市列表
const filteredCities = computed(() => {
  if (!searchQuery.value.trim()) {
    return COMMON_CITIES
  }

  const query = searchQuery.value.toLowerCase().trim()

  return ALL_TIMEZONES.filter((city) => {
    return (
      city.city.toLowerCase().includes(query)
      || city.country.toLowerCase().includes(query)
      || city.timezone.toLowerCase().includes(query)
    )
  })
})

// 检查城市是否已添加
function isCityAdded(cityId: string) {
  return props.existingCityIds.includes(cityId)
}

// 选择城市
function selectCity(cityId: string) {
  // 如果城市已添加，不执行任何操作
  if (isCityAdded(cityId)) {
    return
  }
  emit('select', cityId)
  searchQuery.value = ''
}

// 关闭模态框
function closeModal() {
  emit('close')
  searchQuery.value = ''
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 "
        @click.self="closeModal"
      >
        <div class="bg-white rounded-xl p-6 md:p-8 max-w-4xl w-full max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col">
          <!-- 标题 -->
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-900">
              选择城市
            </h2>
            <button
              class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              @click="closeModal"
            >
              <div class="i-carbon-close text-2xl text-gray-600" />
            </button>
          </div>

          <!-- 搜索框 -->
          <div class="mb-6">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索城市、国家或时区..."
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
          </div>

          <!-- 城市网格 -->
          <div v-if="filteredCities.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-auto">
            <button
              v-for="city in filteredCities"
              :key="city.id"
              :disabled="isCityAdded(city.id)"
              :class="[
                'px-4 py-3 border border-gray-200 rounded-lg text-left transition-all group',
                isCityAdded(city.id)
                  ? 'opacity-50 cursor-not-allowed bg-gray-100'
                  : 'hover:bg-blue-50 hover:border-blue-500',
              ]"
              @click="selectCity(city.id)"
            >
              <div
                :class="[
                  'font-semibold transition-colors',
                  isCityAdded(city.id) ? 'text-gray-400' : 'text-gray-900 group-hover:text-blue-600',
                ]"
              >
                {{ city.city }}
                <span v-if="isCityAdded(city.id)" class="ml-2 text-xs">
                  (已添加)
                </span>
              </div>
              <div class="text-xs text-gray-500 mt-0.5">
                {{ city.country }}
              </div>
            </button>
          </div>

          <!-- 无结果提示 -->
          <div v-else class="text-center py-12 text-gray-500">
            <div class="i-carbon-search-locate text-5xl mx-auto mb-3 opacity-30" />
            <p class="text-lg">
              未找到匹配的城市
            </p>
            <p class="text-sm mt-1">
              请尝试其他关键词
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 模态框过渡动画 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .bg-white,
.modal-leave-active .bg-white {
  transition: transform 0.3s ease;
}

.modal-enter-from .bg-white {
  transform: scale(0.9);
}

.modal-leave-to .bg-white {
  transform: scale(0.9);
}

</style>
