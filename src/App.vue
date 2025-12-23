<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocaleStore } from '@/stores/localeStore'
import TimezoneCalculator from '@/components/timezone/TimezoneCalculator.vue'

const { locale } = useI18n()
const localeStore = useLocaleStore()

onMounted(() => {
  // Initialize locale and sync with vue-i18n
  localeStore.initializeLocale()
  locale.value = localeStore.currentLocale
})
</script>

<template>
  <TimezoneCalculator />
</template>

<style scoped></style>
