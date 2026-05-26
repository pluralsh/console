import { useEffect } from 'react'
import styled from 'styled-components'
import { createColumnHelper } from '@tanstack/react-table'

import Button from '../components/Button'
import Card from '../components/Card'
import Code from '../components/Code'
import Divider from '../components/Divider'
import Flex from '../components/Flex'
import Input2 from '../components/Input2'
import Modal from '../components/Modal'
import Table from '../components/table/Table'
import { FillLevelProvider } from '../components/contexts/FillLevelContext'
import GlobalStyle from '../GlobalStyle'
import HonorableThemeProvider from '../theme/HonorableThemeProvider'
import { ThemeProvider as StyledThemeProvider } from 'styled-components'
import { createStyledTheme, setThemeColorMode } from '../theme'
import {
  THEME_PRESETS,
  getThemeCustomConfig,
  setThemeCustomConfig,
  setThemeEngine,
  setThemePresetId,
  type ThemePresetId,
} from '../theme/themeEngine'

export default {
  title: 'Theme Engine',
  component: null,
}

const Swatch = styled.div<{ $bg: string }>(({ theme, $bg }) => ({
  width: 96,
  height: 48,
  borderRadius: theme.borderRadiuses.medium,
  background: theme.colors[$bg],
  border: theme.borders.default,
}))

const SwatchLabel = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  marginTop: theme.spacing.xxsmall,
}))

function modeForPreset(preset: ThemePresetId) {
  if (preset === 'system') return 'system'
  if (preset === 'light' || preset === 'pure-light') return 'light'
  return 'dark'
}

function ThemeEnginePreview({
  engine = 'v2',
  presetId = 'magic-blue',
}: {
  engine?: 'v1' | 'v2'
  presetId?: ThemePresetId
}) {
  useEffect(() => {
    setThemeEngine(engine)
    setThemePresetId(presetId)

    const mode = modeForPreset(presetId)
    if (mode === 'system') {
      const mm = window?.matchMedia?.('(prefers-color-scheme: light)')
      setThemeColorMode(mm?.matches ? 'light' : 'dark')
    } else {
      setThemeColorMode(mode)
    }

    // ensure custom config exists so switching to custom doesn't surprise
    setThemeCustomConfig(getThemeCustomConfig())
  }, [engine, presetId])

  const mode = modeForPreset(presetId)
  const resolvedMode =
    mode === 'system'
      ? window?.matchMedia?.('(prefers-color-scheme: light)')?.matches
        ? 'light'
        : 'dark'
      : mode

  const styledTheme = createStyledTheme({ mode: resolvedMode })
  const columnHelper = createColumnHelper<{ name: string; value: string }>()
  const tableColumns = [
    columnHelper.accessor((row) => row.name, {
      id: 'name',
      header: 'Name',
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor((row) => row.value, {
      id: 'value',
      header: 'Value',
      cell: (info) => info.getValue(),
    }),
  ]
  const tableData = [
    { name: 'Accent', value: styledTheme.colors['action-primary'] },
    { name: 'Background', value: styledTheme.colors['fill-zero'] },
  ]

  return (
    <StyledThemeProvider theme={styledTheme}>
      <HonorableThemeProvider>
        <GlobalStyle />
        <Flex
          direction="column"
          gap="large"
        >
          <Divider
            text={`engine=${engine} preset=${presetId}`}
            marginBottom="medium"
          />

          <Flex
            direction="column"
            gap="small"
          >
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {(
                [
                  'fill-zero',
                  'fill-zero-hover',
                  'fill-zero-selected',
                  'fill-one',
                  'fill-one-hover',
                  'fill-one-selected',
                  'fill-two',
                  'fill-two-hover',
                  'fill-two-selected',
                  'fill-three',
                  'fill-three-hover',
                  'fill-three-selected',
                ] as const
              ).map((k) => (
                <div key={k}>
                  <Swatch $bg={k} />
                  <SwatchLabel>{k}</SwatchLabel>
                </div>
              ))}
            </div>
          </Flex>

          <Divider text="Layering (Card)" />
          <FillLevelProvider value={0}>
            <Card>
              <Flex
                direction="column"
                gap="small"
              >
                <div>Card @ fillLevel+1</div>
                <Card>
                  <div>Nested card</div>
                </Card>
              </Flex>
            </Card>
          </FillLevelProvider>

          <Divider text="Inputs + buttons" />
          <Flex gap="small">
            <Input2
              value="Hello"
              onChange={() => {}}
            />
            <Button>Primary</Button>
            <Button secondary>Secondary</Button>
          </Flex>

          <Divider text="Code" />
          <Code language="typescript">{`const themePreset = '${presetId}'\nconst engine = '${engine}'\n`}</Code>

          <Divider text="Table" />
          <Table
            fillLevel={0}
            rowBg="base"
            width="900px"
            height="200px"
            columns={tableColumns}
            data={tableData}
          />

          <Divider text="Modal" />
          <Modal
            open
            onClose={() => {}}
            header="Theme modal"
            actions={
              <>
                <Button secondary>Cancel</Button>
                <Button>Save</Button>
              </>
            }
          >
            This modal should sit on derived fills.
          </Modal>
        </Flex>
      </HonorableThemeProvider>
    </StyledThemeProvider>
  )
}

export const Preview = (args: {
  engine: 'v1' | 'v2'
  presetId: ThemePresetId
}) => (
  <ThemeEnginePreview
    engine={args.engine}
    presetId={args.presetId}
  />
)

Preview.args = {
  engine: 'v2',
  presetId: 'magic-blue',
}

Preview.argTypes = {
  presetId: {
    options: THEME_PRESETS.map((p) => p.id),
    control: { type: 'select' },
  },
  engine: {
    options: ['v1', 'v2'],
    control: { type: 'inline-radio' },
  },
}
