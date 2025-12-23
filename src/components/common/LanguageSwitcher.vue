<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useLocaleStore } from '@/stores/localeStore'

const { locale } = useI18n()
const localeStore = useLocaleStore()
const { currentLocale, availableLocales } = storeToRefs(localeStore)
const { setLocale } = localeStore

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

// 当前语言信息
const currentLanguage = computed(() => availableLocales.value[currentLocale.value])

// 切换下拉菜单
function toggleDropdown() {
  isOpen.value = !isOpen.value
}

// 选择语言
function selectLanguage(localeCode: string) {
  setLocale(localeCode as any)
  locale.value = localeCode
  isOpen.value = false
}

// 点击外部关闭下拉菜单
function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="dropdownRef" class="relative">
    <!-- 按钮 -->
    <button
      class="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
      @click="toggleDropdown"
    >
      <span>{{ currentLanguage.shortCode }}</span>
      <div
        :class="[
          'i-carbon-chevron-down text-sm transition-transform',
          isOpen && 'rotate-180',
        ]"
      />
    </button>

    <!-- 下拉菜单 -->
    <Transition name="dropdown">
      <div
        v-if="isOpen"
        class="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[200px] z-50"
      >
        <button
          v-for="(lang, code) in availableLocales"
          :key="code"
          class="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
          :class="currentLocale === code && 'bg-blue-50'"
          @click="selectLanguage(code)"
        >
          <span class="flex items-center gap-2">
            <i :class="lang.flag"></i>
            <span>{{ lang.name }}</span>
          </span>
          <div v-if="currentLocale === code" class="i-carbon-checkmark text-blue-500" />
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
