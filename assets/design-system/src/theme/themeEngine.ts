import chroma from 'chroma-js'
import { useEffect, useState } from 'react'

import { grey, purple } from './colors-base'
import { semanticColorsDark } from './colors-semantic-dark'
import { semanticColorsLight } from './colors-semantic-light'
import type { ColorMode } from '../theme'

export const THEME_ENGINE_KEY = 'theme-engine'
export type ThemeEngine = 'v1' | 'v2'
export const DEFAULT_THEME_ENGINE: ThemeEngine = 'v1'

export const THEME_PRESET_KEY = 'theme-preset'
export type ThemePresetId =
  | 'system'
  | 'light'
  | 'pure-light'
  | 'dark'
  | 'magic-blue'
  | 'classic-dark'
  | 'custom'

export type ThemePreset = {
  id: ThemePresetId
  label: string
}

export const THEME_PRESETS: readonly ThemePreset[] = [
  { id: 'system', label: 'System preference' },
  { id: 'light', label: 'Light' },
  { id: 'pure-light', label: 'Pure Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'magic-blue', label: 'Magic Blue' },
  { id: 'classic-dark', label: 'Classic Dark' },
  { id: 'custom', label: 'Custom' },
] as const

export const THEME_CUSTOM_KEY = 'theme-custom'
export type ThemeCustomConfig = {
  accent: string
  background: string
  contrast: number // 0-100
}

export type ThemeConfig = ThemeCustomConfig & { mode: ColorMode }

export const THEME_ENGINE_DATA_ATTR = 'data-theme-engine'
export const THEME_PRESET_DATA_ATTR = 'data-theme-preset'

const DEFAULT_CUSTOM: ThemeCustomConfig = {
  // matches screenshot-ish defaults
  accent: '#D9E6FF',
  background: '#191A22',
  contrast: 30,
}

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n))

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function getThemeEngine({
  storage = globalThis?.localStorage,
}: {
  storage?: Storage
} = {}): ThemeEngine {
  const raw = storage?.getItem(THEME_ENGINE_KEY)
  return raw === 'v2' || raw === 'v1' ? raw : DEFAULT_THEME_ENGINE
}

export function setThemeEngine(
  engine: ThemeEngine,
  {
    storage = globalThis?.localStorage,
    element = globalThis?.document?.documentElement,
  }: { storage?: Storage; element?: HTMLElement } = {}
) {
  storage?.setItem(THEME_ENGINE_KEY, engine)
  element?.setAttribute(THEME_ENGINE_DATA_ATTR, engine)
}

export function getThemePresetId({
  storage = globalThis?.localStorage,
}: {
  storage?: Storage
} = {}): ThemePresetId {
  const raw = storage?.getItem(THEME_PRESET_KEY)
  return ((THEME_PRESETS.some((p) => p.id === raw)
    ? raw
    : null) as ThemePresetId | null)
    ? (raw as ThemePresetId)
    : 'dark'
}

export function setThemePresetId(
  presetId: ThemePresetId,
  {
    storage = globalThis?.localStorage,
    element = globalThis?.document?.documentElement,
  }: { storage?: Storage; element?: HTMLElement } = {}
) {
  storage?.setItem(THEME_PRESET_KEY, presetId)
  element?.setAttribute(THEME_PRESET_DATA_ATTR, presetId)
}

export function getThemeCustomConfig({
  storage = globalThis?.localStorage,
}: {
  storage?: Storage
} = {}): ThemeCustomConfig {
  const parsed = safeParseJson<Partial<ThemeCustomConfig>>(
    storage?.getItem(THEME_CUSTOM_KEY)
  )
  const accent =
    typeof parsed?.accent === 'string' ? parsed.accent : DEFAULT_CUSTOM.accent
  const background =
    typeof parsed?.background === 'string'
      ? parsed.background
      : DEFAULT_CUSTOM.background
  const contrast =
    typeof parsed?.contrast === 'number'
      ? clamp(parsed.contrast, 0, 100)
      : DEFAULT_CUSTOM.contrast

  return { accent, background, contrast }
}

export function setThemeCustomConfig(
  custom: Partial<ThemeCustomConfig>,
  { storage = globalThis?.localStorage }: { storage?: Storage } = {}
) {
  const next: ThemeCustomConfig = {
    ...getThemeCustomConfig({ storage }),
    ...custom,
  }
  next.contrast = clamp(next.contrast, 0, 100)
  storage?.setItem(THEME_CUSTOM_KEY, JSON.stringify(next))
}

export function resolveThemeConfig({
  mode,
  presetId = getThemePresetId(),
  custom = getThemeCustomConfig(),
}: {
  mode: ColorMode
  presetId?: ThemePresetId
  custom?: ThemeCustomConfig
}): ThemeConfig {
  const systemMode = (() => {
    const mm = globalThis?.matchMedia?.('(prefers-color-scheme: light)')
    return mm?.matches ? ('light' as const) : ('dark' as const)
  })()

  const effectiveMode = presetId === 'system' ? systemMode : mode

  if (presetId === 'custom') {
    return { mode: effectiveMode, ...custom }
  }

  if (presetId === 'magic-blue') {
    return { mode: effectiveMode, ...DEFAULT_CUSTOM }
  }

  if (presetId === 'classic-dark') {
    return {
      mode: 'dark',
      background: grey[950],
      accent: purple[400],
      contrast: 60,
    }
  }

  if (presetId === 'pure-light') {
    return {
      mode: 'light',
      background: '#FFFFFF',
      accent: purple[350],
      contrast: 25,
    }
  }

  if (presetId === 'light') {
    return {
      mode: 'light',
      background: '#FFFFFF',
      accent: purple[350],
      contrast: 50,
    }
  }

  // default dark
  return {
    mode: 'dark',
    background: grey[900],
    accent: purple[400],
    contrast: 50,
  }
}

type FillLevelName = 'fill-zero' | 'fill-one' | 'fill-two' | 'fill-three'
type FillStateSuffix = '' | '-hover' | '-selected'

const STEPS: Record<FillLevelName, number> = {
  'fill-zero': 0,
  'fill-one': 1,
  'fill-two': 2,
  'fill-three': 3,
}
const STATES: Record<FillStateSuffix, number> = {
  '': 0,
  '-hover': 0.5,
  '-selected': 1,
}

// roughly aligns with existing hover deltas while keeping layers subtle
const BASE_OPACITY_PER_STEP = 0.04 // @ contrast=50

export function resolveFill(
  level: FillLevelName,
  suffix: FillStateSuffix,
  cfg: ThemeConfig
): string {
  const overlay = cfg.mode === 'dark' ? '#FFFFFF' : '#000000'
  const alpha =
    (STEPS[level] + STATES[suffix]) *
    BASE_OPACITY_PER_STEP *
    (cfg.contrast / 50)

  return chroma.mix(cfg.background, overlay, clamp(alpha, 0, 0.9), 'rgb').hex()
}

function nudge(color: string, mode: ColorMode, amount: number): string {
  const overlay = mode === 'dark' ? '#FFFFFF' : '#000000'
  return chroma.mix(color, overlay, clamp(amount, 0, 0.9), 'rgb').hex()
}

export function deriveSemanticColors({
  mode,
  presetId,
  custom,
}: {
  mode: ColorMode
  presetId?: ThemePresetId
  custom?: ThemeCustomConfig
}): Record<string, string> {
  const base = mode === 'dark' ? semanticColorsDark : semanticColorsLight
  const cfg = resolveThemeConfig({ mode, presetId, custom })

  const fills: Record<string, string> = {}
  ;(['fill-zero', 'fill-one', 'fill-two', 'fill-three'] as const).forEach(
    (lvl) => {
      ;(['', '-hover', '-selected'] as const).forEach((suffix) => {
        fills[`${lvl}${suffix}`] = resolveFill(lvl, suffix, cfg)
      })
    }
  )

  // Keep existing token names but derive from background/accent.
  return {
    ...base,
    ...fills,
    'fill-accent': cfg.background,
    'fill-primary': cfg.accent,
    'fill-primary-hover': nudge(cfg.accent, cfg.mode, 0.12),
    'action-primary': cfg.accent,
    'action-primary-hover': nudge(cfg.accent, cfg.mode, 0.12),
    'border-outline-focused': nudge(cfg.accent, cfg.mode, 0.25),
  }
}

export function useThemeEngineState({
  element = globalThis?.document?.documentElement,
  engineAttr = THEME_ENGINE_DATA_ATTR,
  presetAttr = THEME_PRESET_DATA_ATTR,
}: {
  element?: HTMLElement
  engineAttr?: string
  presetAttr?: string
} = {}) {
  const [tick, setTick] = useState(0)

  // Mirror `useThemeColorMode`'s approach, but without requiring it.
  useEffect(() => {
    if (!element || !globalThis?.MutationObserver) {
      return
    }
    const obs = new MutationObserver(() => setTick((x) => x + 1))
    obs.observe(element, {
      attributes: true,
      attributeFilter: [engineAttr, presetAttr],
    })
    return () => obs.disconnect()
  }, [element, engineAttr, presetAttr])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = tick

  return {
    engine: getThemeEngine(),
    presetId: getThemePresetId(),
    custom: getThemeCustomConfig(),
  }
}
