<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { COMMON_CITIES, ALL_TIMEZONES } from '@/data/cities'
import { useCityTranslation } from '@/composables/useCityTranslation'
import { formatTimezone } from './composables/useTimezoneFormat'

const { t } = useI18n()
const { getCityName, getCountryName } = useCityTranslation()

const offsetBaseDate = ref(new Date())

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
const searchInputRef = ref<HTMLInputElement | null>(null)
const isMouseDownOutside = ref(false)

watch(
  () => props.show,
  async (isShown) => {
    if (!isShown) return
    offsetBaseDate.value = new Date()
    await nextTick()
    searchInputRef.value?.focus()
    searchInputRef.value?.select()
  },
  { immediate: true },
)

function getUtcOffsetText(timeZone: string) {
  return formatTimezone(timeZone, true, offsetBaseDate.value)
}

// 过滤后的城市列表（支持搜索翻译后的名称）
const filteredCities = computed(() => {
  if (!searchQuery.value.trim()) {
    return COMMON_CITIES
  }

  const query = searchQuery.value.toLowerCase().trim()

  return ALL_TIMEZONES.filter((city) => {
    const translatedCity = getCityName(city.id).toLowerCase()
    const translatedCountry = getCountryName(city.country).toLowerCase()
    const timezone = city.timezone.toLowerCase()

    return (
      translatedCity.includes(query)
      || translatedCountry.includes(query)
      || timezone.includes(query)
      || city.city.toLowerCase().includes(query)
      || city.country.toLowerCase().includes(query)
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

// 处理背景 mousedown 事件
function handleBackgroundMouseDown() {
  isMouseDownOutside.value = true
}

// 处理背景 mouseup 事件
function handleBackgroundMouseUp() {
  if (isMouseDownOutside.value) {
    closeModal()
  }
  isMouseDownOutside.value = false
}

// 关闭模态框
function closeModal() {
  emit('close')
  searchQuery.value = ''
  isMouseDownOutside.value = false
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 "
        @mousedown.self="handleBackgroundMouseDown"
        @mouseup.self="handleBackgroundMouseUp"
      >
        <div class="bg-white rounded-xl p-6 md:p-8 max-w-4xl w-full max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col">
          <!-- 标题 -->
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-900">
              {{ t('citySelector.title') }}
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
              ref="searchInputRef"
              v-model="searchQuery"
              type="text"
              border="1 solid gray-300 focus:transparent"
              :placeholder="t('citySelector.searchPlaceholder')"
              class="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
                <div class="flex items-center gap-2">
                  <div class="min-w-0">
                    <span class="truncate">{{ getCityName(city.id) }}</span>
                    <span v-if="isCityAdded(city.id)" class="ml-2 text-xs">
                      {{ t('citySelector.alreadyAdded') }}
                    </span>
                  </div>
                  <span class="ml-auto shrink-0 text-xs font-normal text-gray-500 tabular-nums">
                    {{ getUtcOffsetText(city.timezone) }}
                  </span>
                </div>
              </div>
              <div class="text-xs text-gray-500 mt-0.5">
                {{ getCountryName(city.country) }}
              </div>
            </button>
          </div>

          <!-- 无结果提示 -->
          <div v-else class="text-center py-12 text-gray-500">
            <div class="i-carbon-search-locate text-5xl mx-auto mb-3 opacity-30" />
            <p class="text-lg">
              {{ t('citySelector.noResults') }}
            </p>
            <p class="text-sm mt-1">
              {{ t('citySelector.tryOtherKeywords') }}
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
