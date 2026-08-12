<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  COMMON_CITIES,
  ALL_TIMEZONES,
  groupByIanaTimezone,
  getOffsetNavFromZones,
  groupByCountry,
  getLetterNavFromCountries,
  type TimezoneZoneEntry,
  type CountryGroup,
} from '@/data/cities'
import type { TimezoneCity } from '@/types/timezone'
import { useCityTranslation } from '@/composables/useCityTranslation'
import { formatTimezone } from './composables/useTimezoneFormat'
import { dayjs } from '@/utils/timezone-helpers'

const { t, locale } = useI18n()
const { getCityName, getCountryName, getTimezoneLabel } = useCityTranslation()

const offsetBaseDate = ref(new Date())

type SelectorMode = 'city' | 'country' | 'timezone'

interface Props {
  show: boolean
  existingCityIds?: string[]
  /** 选择后是否保持打开（添加卡片时为 true，便于连续添加） */
  keepOpenOnSelect?: boolean
}

interface Emits {
  (e: 'select', cityId: string): void
  (e: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  existingCityIds: () => [],
  keepOpenOnSelect: false,
})
const emit = defineEmits<Emits>()

const searchQuery = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
const isMouseDownOutside = ref(false)
const mode = ref<SelectorMode>('city')
const listScrollRef = ref<HTMLElement | null>(null)
const activeOffsetKey = ref<number | null>(null)
const activeLetter = ref<string | null>(null)
/** 展开显示全部城市的国家 ISO 代码 */
const expandedCountries = ref<Set<string>>(new Set())

const modeOptions: Array<{ id: SelectorMode, labelKey: string, icon: string }> = [
  { id: 'city', labelKey: 'citySelector.byCity', icon: 'i-carbon-location' },
  { id: 'country', labelKey: 'citySelector.byCountry', icon: 'i-carbon-earth' },
  { id: 'timezone', labelKey: 'citySelector.byTimezone', icon: 'i-carbon-time' },
]

watch(
  () => props.show,
  async (isShown) => {
    if (!isShown)
      return
    offsetBaseDate.value = new Date()
    mode.value = 'city'
    searchQuery.value = ''
    expandedCountries.value = new Set()
    activeLetter.value = null
    activeOffsetKey.value = null
    await nextTick()
    searchInputRef.value?.focus()
    searchInputRef.value?.select()
  },
  { immediate: true },
)

function getUtcOffsetText(timeZone: string) {
  return formatTimezone(timeZone, true, offsetBaseDate.value)
}

function displayCityName(city: TimezoneCity) {
  // 显式依赖 locale，确保切换语言时模板重算
  void locale.value
  return getCityName(city.id, city.city, city.timezone)
}

function displayCountryName(country: string, timezone?: string) {
  void locale.value
  return getCountryName(country, timezone)
}

function displayTimezoneLabel(timezone: string) {
  void locale.value
  return getTimezoneLabel(timezone)
}

function modeTitle(m: SelectorMode): string {
  if (m === 'timezone')
    return t('citySelector.timezoneTitle')
  if (m === 'country')
    return t('citySelector.countryTitle')
  return t('citySelector.title')
}

function modePlaceholder(m: SelectorMode): string {
  if (m === 'timezone')
    return t('citySelector.timezoneSearchPlaceholder')
  if (m === 'country')
    return t('citySelector.countrySearchPlaceholder')
  return t('citySelector.searchPlaceholder')
}

// 过滤后的城市列表（支持搜索翻译后的名称）
const filteredCities = computed(() => {
  if (!searchQuery.value.trim()) {
    return COMMON_CITIES
  }

  const query = searchQuery.value.toLowerCase().trim()

  return ALL_TIMEZONES.filter((city) => {
    const translatedCity = displayCityName(city).toLowerCase()
    const translatedCountry = displayCountryName(city.country, city.timezone).toLowerCase()
    const timezone = city.timezone.toLowerCase()
    const tzLabel = displayTimezoneLabel(city.timezone).toLowerCase()

    return (
      translatedCity.includes(query)
      || translatedCountry.includes(query)
      || timezone.includes(query)
      || tzLabel.includes(query)
      || city.city.toLowerCase().includes(query)
      || city.country.toLowerCase().includes(query)
    )
  })
})

// 按 IANA 时区聚合（参考全部时区列表页）
const timezoneZones = computed((): TimezoneZoneEntry[] => {
  // 依赖 locale，切换语言后列表展示名一并刷新
  void locale.value
  let cities = ALL_TIMEZONES

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    cities = ALL_TIMEZONES.filter((city) => {
      const translatedCity = displayCityName(city).toLowerCase()
      const translatedCountry = displayCountryName(city.country, city.timezone).toLowerCase()
      const timezone = city.timezone.toLowerCase()
      const tzLabel = displayTimezoneLabel(city.timezone).toLowerCase()
      const offsetLabel = getUtcOffsetText(city.timezone).toLowerCase()

      return (
        translatedCity.includes(query)
        || translatedCountry.includes(query)
        || timezone.includes(query)
        || tzLabel.includes(query)
        || city.city.toLowerCase().includes(query)
        || city.country.toLowerCase().includes(query)
        || offsetLabel.includes(query)
      )
    })
  }

  return groupByIanaTimezone(cities, offsetBaseDate.value)
})

// 时区快捷导航：按偏移去重
const offsetNavItems = computed(() => getOffsetNavFromZones(timezoneZones.value))

// 按国家聚合（英文国名 A–Z）；搜索支持国名 / 城市 / 时区
const countryGroups = computed((): CountryGroup[] => {
  void locale.value
  const allGroups = groupByCountry(ALL_TIMEZONES)

  if (!searchQuery.value.trim())
    return allGroups

  const query = searchQuery.value.toLowerCase().trim()

  return allGroups
    .map((g) => {
      const localized = displayCountryName(g.countryCode).toLowerCase()
      const countryHit
        = g.englishName.toLowerCase().includes(query)
          || localized.includes(query)
          || g.countryCode.toLowerCase().includes(query)

      // 国名命中：展示该国完整列表（默认仍用 commonCities 折叠）
      if (countryHit)
        return g

      const matchedCities = g.cities.filter((city) => {
        const translatedCity = displayCityName(city).toLowerCase()
        const timezone = city.timezone.toLowerCase()
        const tzLabel = displayTimezoneLabel(city.timezone).toLowerCase()

        return (
          translatedCity.includes(query)
          || timezone.includes(query)
          || tzLabel.includes(query)
          || city.city.toLowerCase().includes(query)
        )
      })

      if (matchedCities.length === 0)
        return null

      // 仅城市命中：直接展示匹配项
      return {
        ...g,
        cities: matchedCities,
        commonCities: matchedCities,
      }
    })
    .filter((g): g is CountryGroup => g != null)
})

const letterNavItems = computed(() => getLetterNavFromCountries(countryGroups.value))

/** 每个字母段的首个国家 code，用于粘性字母锚点 */
const firstCountryByLetter = computed(() => {
  const map = new Map<string, string>()
  for (const g of countryGroups.value) {
    if (!map.has(g.letter))
      map.set(g.letter, g.countryCode)
  }
  return map
})

function countryRowId(group: CountryGroup): string | undefined {
  if (firstCountryByLetter.value.get(group.letter) === group.countryCode)
    return `country-letter-${group.letter === '#' ? 'other' : group.letter}`
  return undefined
}

function isCityAdded(cityId: string) {
  return props.existingCityIds.includes(cityId)
}

function selectCity(cityId: string) {
  if (isCityAdded(cityId))
    return
  emit('select', cityId)
  if (!props.keepOpenOnSelect)
    searchQuery.value = ''
}

function switchMode(next: SelectorMode) {
  if (mode.value === next)
    return
  mode.value = next
  searchQuery.value = ''
  activeOffsetKey.value = null
  activeLetter.value = null
  expandedCountries.value = new Set()
  nextTick(() => {
    searchInputRef.value?.focus()
    listScrollRef.value?.scrollTo({ top: 0 })
  })
}

function scrollToOffset(offsetMinutes: number) {
  activeOffsetKey.value = offsetMinutes
  const container = listScrollRef.value
  const el = document.getElementById(`offset-anchor-${offsetMinutes}`)
  if (el && container) {
    const containerRect = container.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    const top = elRect.top - containerRect.top + container.scrollTop - 4
    container.scrollTo({ top, behavior: 'smooth' })
  }
}

function scrollToLetter(letter: string) {
  activeLetter.value = letter
  const container = listScrollRef.value
  const anchor = letter === '#' ? 'other' : letter
  const el = document.getElementById(`country-letter-${anchor}`)
  if (el && container) {
    const containerRect = container.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    const top = elRect.top - containerRect.top + container.scrollTop - 4
    container.scrollTo({ top, behavior: 'smooth' })
  }
}

function localTimeForOffset(offsetMinutes: number): string {
  return dayjs(offsetBaseDate.value).utcOffset(offsetMinutes).format('HH:mm')
}

/** 每个偏移段的首个时区 id，用于锚点导航 */
const firstZoneIdByOffset = computed(() => {
  const map = new Map<number, string>()
  for (const zone of timezoneZones.value) {
    if (!map.has(zone.offsetMinutes))
      map.set(zone.offsetMinutes, zone.timezone)
  }
  return map
})

function zoneRowId(zone: TimezoneZoneEntry): string | undefined {
  if (firstZoneIdByOffset.value.get(zone.offsetMinutes) === zone.timezone)
    return `offset-anchor-${zone.offsetMinutes}`
  return undefined
}

function visibleCitiesForCountry(group: CountryGroup): TimezoneCity[] {
  if (expandedCountries.value.has(group.countryCode))
    return group.cities
  return group.commonCities
}

function hiddenCityCount(group: CountryGroup): number {
  if (expandedCountries.value.has(group.countryCode))
    return 0
  return Math.max(0, group.cities.length - group.commonCities.length)
}

function toggleCountryExpand(countryCode: string) {
  const next = new Set(expandedCountries.value)
  if (next.has(countryCode))
    next.delete(countryCode)
  else
    next.add(countryCode)
  expandedCountries.value = next
}

function handleBackgroundMouseDown() {
  isMouseDownOutside.value = true
}

function handleBackgroundMouseUp() {
  if (isMouseDownOutside.value) {
    closeModal()
  }
  isMouseDownOutside.value = false
}

function closeModal() {
  emit('close')
  searchQuery.value = ''
  mode.value = 'city'
  isMouseDownOutside.value = false
  activeOffsetKey.value = null
  activeLetter.value = null
  expandedCountries.value = new Set()
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
        <div class="bg-white rounded-xl p-5 md:p-7 max-w-5xl w-full max-h-[88vh] overflow-hidden shadow-2xl flex flex-col">
          <!-- 标题 + 关闭 -->
          <div class="flex justify-between items-center mb-4 gap-3 shrink-0">
            <h2 class="text-xl md:text-2xl font-bold text-gray-900 truncate">
              {{ modeTitle(mode) }}
            </h2>
            <button
              class="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
              @click="closeModal"
            >
              <div class="i-carbon-close text-2xl text-gray-600" />
            </button>
          </div>

          <!-- 三段模式切换 -->
          <div class="mb-4 shrink-0 flex p-1 bg-gray-100 rounded-xl gap-0.5">
            <button
              v-for="opt in modeOptions"
              :key="opt.id"
              type="button"
              :class="[
                'flex-1 inline-flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors min-w-0',
                mode === opt.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900',
              ]"
              @click="switchMode(opt.id)"
            >
              <div :class="[opt.icon, 'text-base shrink-0']" />
              <span class="truncate">{{ t(opt.labelKey) }}</span>
            </button>
          </div>

          <!-- 搜索框 -->
          <div class="mb-4 shrink-0">
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              type="text"
              border="1 solid gray-300 focus:transparent"
              :placeholder="modePlaceholder(mode)"
              class="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
          </div>

          <!-- ========== 常用城市模式 ========== -->
          <template v-if="mode === 'city'">
            <div
              v-if="filteredCities.length > 0"
              class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-auto min-h-0 flex-1"
            >
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
                      <span class="truncate">{{ displayCityName(city) }}</span>
                      <span v-if="isCityAdded(city.id)" class="ml-2 text-xs">
                        {{ t('citySelector.alreadyAdded') }}
                      </span>
                    </div>
                    <span class="ml-auto shrink-0 text-xs font-normal text-gray-500 tabular-nums">
                      {{ getUtcOffsetText(city.timezone) }}
                    </span>
                  </div>
                </div>
                <div
                  v-if="displayCountryName(city.country, city.timezone)"
                  class="text-xs text-gray-500 mt-0.5"
                >
                  {{ displayCountryName(city.country, city.timezone) }}
                </div>
              </button>
            </div>

            <div v-else class="text-center py-12 text-gray-500 flex-1">
              <div class="i-carbon-search-locate text-5xl mx-auto mb-3 opacity-30" />
              <p class="text-lg">
                {{ t('citySelector.noResults') }}
              </p>
              <p class="text-sm mt-1">
                {{ t('citySelector.tryOtherKeywords') }}
              </p>
            </div>
          </template>

          <!-- ========== 按国家模式 ========== -->
          <template v-else-if="mode === 'country'">
            <!-- A–Z 快捷导航 -->
            <div
              v-if="letterNavItems.length > 0"
              class="mb-3 shrink-0 flex gap-1 overflow-x-auto pb-1 scrollbar-thin"
            >
              <button
                v-for="item in letterNavItems"
                :key="item.letter"
                type="button"
                :class="[
                  'shrink-0 min-w-[1.75rem] px-2 py-1 rounded-md text-xs font-semibold tabular-nums border transition-colors',
                  activeLetter === item.letter
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-600',
                ]"
                @click="scrollToLetter(item.letter)"
              >
                {{ item.letter }}
              </button>
            </div>

            <div
              v-if="countryGroups.length > 0"
              ref="listScrollRef"
              class="overflow-auto min-h-0 flex-1 border border-gray-200 rounded-lg"
            >
              <!-- 表头（桌面） -->
              <div class="hidden md:grid sticky top-0 z-20 grid-cols-[minmax(10rem,0.9fr)_minmax(14rem,1.6fr)] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <div>{{ t('citySelector.colCountry') }}</div>
                <div>{{ t('citySelector.colCitiesInCountry') }}</div>
              </div>

              <template v-for="group in countryGroups" :key="group.countryCode">
                <!-- 字母分段标题（该字母首个国家前） -->
                <div
                  v-if="countryRowId(group)"
                  :id="countryRowId(group)"
                  class="sticky top-0 md:top-[2.4rem] z-10 px-4 py-1.5 bg-gray-100/95 backdrop-blur-sm border-b border-gray-200 text-xs font-bold text-gray-500 tracking-widest scroll-mt-2"
                >
                  {{ group.letter }}
                </div>

                <div class="border-b border-gray-100 last:border-b-0">
                  <!-- 桌面行 -->
                  <div class="hidden md:grid grid-cols-[minmax(10rem,0.9fr)_minmax(14rem,1.6fr)] gap-3 px-4 py-3 items-start hover:bg-blue-50/40 transition-colors">
                    <div class="min-w-0">
                      <div class="text-sm font-semibold text-gray-900 truncate leading-snug flex items-center gap-1.5">
                        <span class="i-carbon-earth shrink-0 opacity-50 text-sm" />
                        <span class="truncate">{{ displayCountryName(group.countryCode) }}</span>
                      </div>
                      <div class="text-[11px] text-gray-400 mt-0.5 truncate" :title="group.englishName">
                        {{ group.englishName }}
                        <span class="ml-1 font-mono opacity-80">{{ group.countryCode }}</span>
                      </div>
                    </div>

                    <div class="flex flex-wrap gap-1.5 min-w-0 content-start">
                      <button
                        v-for="city in visibleCitiesForCountry(group)"
                        :key="`${city.id}-${locale}`"
                        type="button"
                        :disabled="isCityAdded(city.id)"
                        :title="isCityAdded(city.id) ? t('citySelector.alreadyAdded') : t('citySelector.addThisCity')"
                        :class="[
                          'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-colors max-w-full',
                          isCityAdded(city.id)
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50',
                        ]"
                        @click="selectCity(city.id)"
                      >
                        <span class="i-carbon-location shrink-0 text-[11px] opacity-70" />
                        <span class="truncate">{{ displayCityName(city) }}</span>
                        <span class="text-[10px] text-gray-400 tabular-nums shrink-0">
                          {{ getUtcOffsetText(city.timezone) }}
                        </span>
                        <span v-if="isCityAdded(city.id)" class="text-[10px] opacity-70">✓</span>
                      </button>

                      <button
                        v-if="hiddenCityCount(group) > 0 || expandedCountries.has(group.countryCode)"
                        type="button"
                        class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors"
                        @click="toggleCountryExpand(group.countryCode)"
                      >
                        {{
                          expandedCountries.has(group.countryCode)
                            ? t('citySelector.showLess')
                            : t('citySelector.moreCities', { count: hiddenCityCount(group) })
                        }}
                      </button>
                    </div>
                  </div>

                  <!-- 移动端卡片行 -->
                  <div class="md:hidden px-3 py-3 space-y-2.5 hover:bg-blue-50/30">
                    <div>
                      <div class="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                        <span class="i-carbon-earth shrink-0 opacity-50" />
                        {{ displayCountryName(group.countryCode) }}
                      </div>
                      <div class="text-[11px] text-gray-400 mt-0.5">
                        {{ group.englishName }}
                        <span class="ml-1 font-mono">{{ group.countryCode }}</span>
                      </div>
                    </div>

                    <div>
                      <div class="text-[11px] text-gray-400 mb-1.5 font-medium">
                        {{ t('citySelector.colCitiesInCountry') }}
                      </div>
                      <div class="flex flex-wrap gap-1.5">
                        <button
                          v-for="city in visibleCitiesForCountry(group)"
                          :key="`${city.id}-${locale}`"
                          type="button"
                          :disabled="isCityAdded(city.id)"
                          :title="isCityAdded(city.id) ? t('citySelector.alreadyAdded') : t('citySelector.addThisCity')"
                          :class="[
                            'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-colors',
                            isCityAdded(city.id)
                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-blue-500 hover:text-blue-600',
                          ]"
                          @click="selectCity(city.id)"
                        >
                          <span class="i-carbon-location shrink-0 text-[11px] opacity-70" />
                          {{ displayCityName(city) }}
                          <span class="text-[10px] text-gray-400 tabular-nums">
                            {{ getUtcOffsetText(city.timezone) }}
                          </span>
                          <span v-if="isCityAdded(city.id)">✓</span>
                        </button>

                        <button
                          v-if="hiddenCityCount(group) > 0 || expandedCountries.has(group.countryCode)"
                          type="button"
                          class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-blue-600"
                          @click="toggleCountryExpand(group.countryCode)"
                        >
                          {{
                            expandedCountries.has(group.countryCode)
                              ? t('citySelector.showLess')
                              : t('citySelector.moreCities', { count: hiddenCityCount(group) })
                          }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>

            <div v-else class="text-center py-12 text-gray-500 flex-1">
              <div class="i-carbon-earth text-5xl mx-auto mb-3 opacity-30" />
              <p class="text-lg">
                {{ t('citySelector.noResults') }}
              </p>
              <p class="text-sm mt-1">
                {{ t('citySelector.tryOtherKeywords') }}
              </p>
            </div>

            <p
              v-if="countryGroups.length > 0 && keepOpenOnSelect"
              class="mt-3 shrink-0 text-xs text-gray-400 text-center"
            >
              {{ t('citySelector.multiAddHint') }}
            </p>
          </template>

          <!-- ========== 时区选择模式 ========== -->
          <template v-else>
            <!-- 偏移快捷导航 -->
            <div
              v-if="offsetNavItems.length > 0"
              class="mb-3 shrink-0 flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin"
            >
              <button
                v-for="item in offsetNavItems"
                :key="item.offsetMinutes"
                type="button"
                :class="[
                  'shrink-0 px-2.5 py-1 rounded-md text-xs font-medium tabular-nums border transition-colors',
                  activeOffsetKey === item.offsetMinutes
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-600',
                ]"
                @click="scrollToOffset(item.offsetMinutes)"
              >
                {{ item.label }}
              </button>
            </div>

            <div
              v-if="timezoneZones.length > 0"
              ref="listScrollRef"
              class="overflow-auto min-h-0 flex-1 border border-gray-200 rounded-lg"
            >
              <!-- 表头（桌面） -->
              <div class="hidden md:grid sticky top-0 z-20 grid-cols-[minmax(9rem,0.9fr)_minmax(12rem,1.2fr)_minmax(12rem,1.6fr)] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <div>{{ t('citySelector.colUtcLocal') }}</div>
                <div>{{ t('citySelector.colTimezoneCountry') }}</div>
                <div>{{ t('citySelector.colMajorCities') }}</div>
              </div>

              <!-- 时区行 -->
              <div
                v-for="zone in timezoneZones"
                :id="zoneRowId(zone)"
                :key="zone.timezone"
                class="border-b border-gray-100 last:border-b-0 scroll-mt-2"
              >
                <!-- 桌面行 -->
                <div
                  class="hidden md:grid grid-cols-[minmax(9rem,0.9fr)_minmax(12rem,1.2fr)_minmax(12rem,1.6fr)] gap-3 px-4 py-3 items-start hover:bg-blue-50/40 transition-colors"
                >
                  <div class="min-w-0">
                    <div class="font-bold text-gray-900 tabular-nums text-sm">
                      {{ zone.offsetLabel }}
                    </div>
                    <div class="text-xs text-gray-500 mt-0.5 tabular-nums">
                      {{ t('citySelector.localTime') }}
                      {{ localTimeForOffset(zone.offsetMinutes) }}
                    </div>
                  </div>

                  <div class="min-w-0">
                    <div class="text-sm font-semibold text-gray-900 truncate leading-snug">
                      {{ displayCityName(zone.primaryCity) }}
                    </div>
                    <div
                      v-if="displayCountryName(zone.country, zone.timezone)"
                      class="text-xs text-gray-500 mt-0.5 flex items-center gap-1"
                    >
                      <span class="i-carbon-earth shrink-0 opacity-60" />
                      <span class="truncate">{{ displayCountryName(zone.country, zone.timezone) }}</span>
                    </div>
                    <div class="text-[11px] text-gray-400 mt-0.5 font-mono truncate" :title="zone.timezone">
                      {{ zone.timezone }}
                    </div>
                  </div>

                  <div class="flex flex-wrap gap-1.5 min-w-0 content-start">
                    <button
                      v-for="city in zone.cities"
                      :key="`${city.id}-${locale}`"
                      type="button"
                      :disabled="isCityAdded(city.id)"
                      :title="isCityAdded(city.id) ? t('citySelector.alreadyAdded') : t('citySelector.addThisCity')"
                      :class="[
                        'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-colors max-w-full',
                        isCityAdded(city.id)
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50',
                      ]"
                      @click="selectCity(city.id)"
                    >
                      <span class="i-carbon-location shrink-0 text-[11px] opacity-70" />
                      <span class="truncate">{{ displayCityName(city) }}</span>
                      <span v-if="isCityAdded(city.id)" class="text-[10px] opacity-70">✓</span>
                    </button>
                  </div>
                </div>

                <!-- 移动端卡片行 -->
                <div class="md:hidden px-3 py-3 space-y-2.5 hover:bg-blue-50/30">
                  <div>
                    <div class="font-bold text-gray-900 tabular-nums">
                      {{ zone.offsetLabel }}
                    </div>
                    <div class="text-xs text-gray-500 tabular-nums mt-0.5">
                      {{ t('citySelector.localTime') }}
                      {{ localTimeForOffset(zone.offsetMinutes) }}
                    </div>
                  </div>

                  <div>
                    <div class="text-sm font-semibold text-gray-900">
                      {{ displayCityName(zone.primaryCity) }}
                    </div>
                    <div
                      v-if="displayCountryName(zone.country, zone.timezone)"
                      class="text-xs text-gray-500 mt-0.5 flex items-center gap-1"
                    >
                      <span class="i-carbon-earth shrink-0 opacity-60" />
                      {{ displayCountryName(zone.country, zone.timezone) }}
                    </div>
                    <div class="text-[11px] text-gray-400 mt-0.5 font-mono break-all">
                      {{ zone.timezone }}
                    </div>
                  </div>

                  <div>
                    <div class="text-[11px] text-gray-400 mb-1.5 font-medium">
                      {{ t('citySelector.colMajorCities') }}
                    </div>
                    <div class="flex flex-wrap gap-1.5">
                      <button
                        v-for="city in zone.cities"
                        :key="`${city.id}-${locale}`"
                        type="button"
                        :disabled="isCityAdded(city.id)"
                        :title="isCityAdded(city.id) ? t('citySelector.alreadyAdded') : t('citySelector.addThisCity')"
                        :class="[
                          'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-colors',
                          isCityAdded(city.id)
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-blue-500 hover:text-blue-600',
                        ]"
                        @click="selectCity(city.id)"
                      >
                        <span class="i-carbon-location shrink-0 text-[11px] opacity-70" />
                        {{ displayCityName(city) }}
                        <span v-if="isCityAdded(city.id)">✓</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="text-center py-12 text-gray-500 flex-1">
              <div class="i-carbon-time text-5xl mx-auto mb-3 opacity-30" />
              <p class="text-lg">
                {{ t('citySelector.noResults') }}
              </p>
              <p class="text-sm mt-1">
                {{ t('citySelector.tryOtherKeywords') }}
              </p>
            </div>

            <p
              v-if="timezoneZones.length > 0 && keepOpenOnSelect"
              class="mt-3 shrink-0 text-xs text-gray-400 text-center"
            >
              {{ t('citySelector.multiAddHint') }}
            </p>
          </template>
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

.scrollbar-thin {
  scrollbar-width: thin;
}
</style>
