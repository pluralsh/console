import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import styled from 'styled-components'

import {
  DEFAULT_SCALE_PRESET_ID,
  SCALE_PRESET_IDS,
  isScalePresetId,
  scalePresets,
  type ScalePresetId,
} from '../../theme/scale-presets'

const STORAGE_KEY = 'plural-prototype-scale'

type ScalePresetContextValue = {
  scaleId: ScalePresetId
  setScaleId: (id: ScalePresetId) => void
  switcherEnabled: boolean
}

const ScalePresetContext = createContext<ScalePresetContextValue>({
  scaleId: DEFAULT_SCALE_PRESET_ID,
  setScaleId: () => {},
  switcherEnabled: false,
})

function readStoredScaleId(): ScalePresetId {
  if (typeof window === 'undefined') return DEFAULT_SCALE_PRESET_ID
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isScalePresetId(stored)) return stored
  } catch {
    /* ignore */
  }
  return DEFAULT_SCALE_PRESET_ID
}

function persistScaleId(id: ScalePresetId) {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    /* ignore */
  }
}

export function ScalePresetProvider({
  children,
  switcherEnabled = false,
}: {
  children: ReactNode
  switcherEnabled?: boolean
}) {
  const [scaleId, setScaleIdState] = useState<ScalePresetId>(readStoredScaleId)

  const setScaleId = useCallback((id: ScalePresetId) => {
    setScaleIdState(id)
    persistScaleId(id)
  }, [])

  const effectiveScaleId = switcherEnabled ? scaleId : DEFAULT_SCALE_PRESET_ID

  const value = useMemo(
    () => ({
      scaleId: effectiveScaleId,
      setScaleId,
      switcherEnabled,
    }),
    [effectiveScaleId, setScaleId, switcherEnabled]
  )

  return (
    <ScalePresetContext.Provider value={value}>
      {children}
    </ScalePresetContext.Provider>
  )
}

export function useScalePreset() {
  return useContext(ScalePresetContext)
}

const Panel = styled.div(({ theme }) => ({
  position: 'fixed',
  bottom: theme.spacing.medium,
  right: theme.spacing.medium,
  zIndex: 3000,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
  padding: theme.spacing.small,
  background: theme.colors['fill-two'],
  border: theme.borders.default,
  borderRadius: theme.borderRadiuses.large,
  boxShadow: theme.boxShadows.moderate,
  fontSize: theme.partials.text.caption.fontSize,
  color: theme.colors.text,
  minWidth: 140,
}))

const Title = styled.div(({ theme }) => ({
  fontWeight: 600,
  letterSpacing: '0.5px',
  color: theme.colors['text-xlight'],
  marginBottom: theme.spacing.xxxsmall,
}))

const ScaleButton = styled.button<{ $active?: boolean }>(
  ({ theme, $active }) => ({
    textAlign: 'left',
    padding: `${theme.spacing.xxsmall}px ${theme.spacing.xsmall}px`,
    borderRadius: theme.borderRadiuses.medium,
    background: $active ? theme.colors['fill-three'] : 'transparent',
    color: $active ? theme.colors.text : theme.colors['text-light'],
    border: `1px solid ${$active ? theme.colors['border-fill-three'] : 'transparent'}`,
    cursor: 'pointer',
    font: 'inherit',
    transition: 'background 0.15s ease, color 0.15s ease',
    '&:hover': {
      background: theme.colors['fill-three-hover'],
      color: theme.colors.text,
    },
  })
)

export function DevScaleLabToggle() {
  const { scaleId, setScaleId, switcherEnabled } = useScalePreset()

  if (!switcherEnabled) return null

  return (
    <Panel
      role="group"
      aria-label="Spacing scale"
    >
      <Title>Scale</Title>
      {SCALE_PRESET_IDS.map((id) => (
        <ScaleButton
          key={id}
          type="button"
          $active={scaleId === id}
          aria-pressed={scaleId === id}
          onClick={() => setScaleId(id)}
        >
          {scalePresets[id].label}
        </ScaleButton>
      ))}
    </Panel>
  )
}
