import {
  Button,
  Card,
  ClusterIcon,
  Divider,
  Flex,
  IconFrame,
  Input2,
  ListBoxItem,
  Select,
  Slider,
  Switch,
  THEME_PRESETS,
  getThemeCustomConfig,
  getThemeEngine,
  getThemePresetId,
  setThemeCustomConfig,
  setThemeEngine,
  setThemeColorMode,
  setThemePresetId,
  WorkbenchIcon,
} from '@pluralsh/design-system'
import { useLogin } from 'components/contexts'
import { GqlError } from 'components/utils/Alert'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import { Homepage, useUpdateUserMutation } from 'generated/graphql'
import { ReactElement, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'

type ColorMode = 'light' | 'dark'

export function GlobalSettingsGeneral() {
  const { spacing } = useTheme()
  const { me } = useLogin()
  const { popToast } = useSimpleToast()
  const savedHomepage = me?.homepage ?? Homepage.Clusters
  const savedThemeEngine = getThemeEngine()
  const savedThemePreset = getThemePresetId()
  const savedThemeCustom = getThemeCustomConfig()

  const [homepage, setHomepage] = useState<Homepage>(savedHomepage)
  const [themeEngine, setThemeEngineState] =
    useState<ReturnType<typeof getThemeEngine>>(savedThemeEngine)
  const [themePreset, setThemePresetState] =
    useState<ReturnType<typeof getThemePresetId>>(savedThemePreset)
  const [customAccent, setCustomAccent] = useState(savedThemeCustom.accent)
  const [customBackground, setCustomBackground] = useState(
    savedThemeCustom.background
  )
  const [customContrast, setCustomContrast] = useState(
    savedThemeCustom.contrast
  )

  const [mutation, { loading, error }] = useUpdateUserMutation({
    variables: { attributes: { homepage } },
    onCompleted: () =>
      popToast({
        content: 'Settings updated successfully',
        severity: 'success',
      }),
    refetchQueries: ['Me'],
    awaitRefetchQueries: true,
  })

  const changed =
    homepage !== savedHomepage ||
    themeEngine !== savedThemeEngine ||
    themePreset !== savedThemePreset ||
    customAccent !== savedThemeCustom.accent ||
    customBackground !== savedThemeCustom.background ||
    customContrast !== savedThemeCustom.contrast

  const isCustomPreset = themePreset === 'custom'

  const themePresetOptions = useMemo(
    () =>
      Object.fromEntries(
        THEME_PRESETS.map(({ id, label }) => [id, { label }] as const)
      ) as Record<string, { label: string }>,
    []
  )

  const handleSave = async () => {
    if (homepage !== savedHomepage) await mutation()
    if (themeEngine !== savedThemeEngine) setThemeEngine(themeEngine)
    if (themePreset !== savedThemePreset) setThemePresetId(themePreset)

    if (
      customAccent !== savedThemeCustom.accent ||
      customBackground !== savedThemeCustom.background ||
      customContrast !== savedThemeCustom.contrast
    ) {
      setThemeCustomConfig({
        accent: customAccent,
        background: customBackground,
        contrast: customContrast,
      })
    }

    const nextMode = modeForPreset(themePreset)
    if (nextMode === 'system') {
      const mm = window?.matchMedia?.('(prefers-color-scheme: light)')
      setThemeColorMode(mm?.matches ? 'light' : 'dark')
    } else {
      setThemeColorMode(nextMode)
    }
  }

  return (
    <Flex
      direction="column"
      gap="medium"
    >
      {error && <GqlError error={error} />}
      <Card css={{ padding: spacing.large }}>
        <StretchedFlex>
          <StackedText
            first="Default home view"
            firstPartialType="body2Bold"
            firstColor="text"
            second="Select which default layout to display when launching your console"
          />
          <Select
            width={250}
            selectedKey={homepage}
            leftContent={homepageOptions[homepage].icon}
            onSelectionChange={(key) => setHomepage(key as Homepage)}
          >
            {Object.entries(homepageOptions).map(([key, { label, icon }]) => (
              <ListBoxItem
                key={key}
                leftContent={<IconFrame icon={icon} />}
                label={label}
              />
            ))}
          </Select>
        </StretchedFlex>
        <Divider
          backgroundColor="border-fill-two"
          css={{ margin: `${spacing.large}px 0` }}
        />
        <StretchedFlex>
          <StackedText
            first="Interface theme"
            firstPartialType="body2Bold"
            firstColor="text"
            second="Select or customize your interface color scheme"
          />
          <Flex
            direction="column"
            gap="small"
            align="flex-end"
          >
            <Select
              width={250}
              selectedKey={themePreset}
              onSelectionChange={(key) => setThemePresetState(key as any)}
            >
              {Object.entries(themePresetOptions).map(([key, { label }]) => (
                <ListBoxItem
                  key={key}
                  label={label}
                />
              ))}
            </Select>

            {isCustomPreset && (
              <Flex
                direction="column"
                gap="small"
                css={{ width: 360 }}
              >
                <ColorRow
                  label="Accent"
                  value={customAccent}
                  onChange={setCustomAccent}
                />
                <ColorRow
                  label="Background"
                  value={customBackground}
                  onChange={setCustomBackground}
                />
                <Flex
                  direction="column"
                  gap="xsmall"
                >
                  <StackedText
                    first="Contrast"
                    firstPartialType="caption"
                    second={`${customContrast}`}
                  />
                  <Slider
                    colorized={false}
                    tooltip={false}
                    minValue={0}
                    maxValue={100}
                    value={customContrast}
                    onChange={(value) => setCustomContrast(value)}
                  />
                </Flex>
              </Flex>
            )}
          </Flex>
        </StretchedFlex>
        <Divider
          backgroundColor="border-fill-two"
          css={{ margin: `${spacing.large}px 0` }}
        />
        <StretchedFlex>
          <StackedText
            first="Theme engine"
            firstPartialType="body2Bold"
            firstColor="text"
            second="Use v2 derived fill overlays (spike)"
          />
          <Switch
            checked={themeEngine === 'v2'}
            onChange={(checked) => setThemeEngineState(checked ? 'v2' : 'v1')}
          />
        </StretchedFlex>
      </Card>
      <Button
        disabled={!changed}
        loading={loading}
        onClick={handleSave}
        alignSelf="flex-end"
      >
        Save changes
      </Button>
    </Flex>
  )
}

const homepageOptions: Record<Homepage, { label: string; icon: ReactElement }> =
  {
    [Homepage.Workbenches]: {
      label: 'Workbench',
      icon: <WorkbenchIcon size={16} />,
    },
    [Homepage.Clusters]: {
      label: 'Clusters overview',
      icon: <ClusterIcon size={16} />,
    },
  }

function modeForPreset(preset: string): ColorMode | 'system' {
  if (preset === 'system') return 'system'
  if (preset === 'light' || preset === 'pure-light') return 'light'
  return 'dark'
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (next: string) => void
}) {
  return (
    <StretchedFlex>
      <StackedText
        first={label}
        firstPartialType="caption"
      />
      <Input2
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        inputProps={{ spellCheck: false }}
        suffix={
          <input
            aria-label={`${label} color`}
            type="color"
            value={isHexColor(value) ? value : '#000000'}
            onChange={(e) => onChange(e.currentTarget.value)}
            style={{
              width: 28,
              height: 28,
              padding: 0,
              border: 'none',
              background: 'transparent',
            }}
          />
        }
        css={{ width: 250 }}
      />
    </StretchedFlex>
  )
}

function isHexColor(value: string) {
  return /^#([0-9a-fA-F]{6})$/.test(value)
}
