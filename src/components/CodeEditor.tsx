import { type Dispatch, useCallback, useEffect, useState } from 'react'
import { Div, Flex, P } from 'honorable'
import { useTheme } from 'styled-components'

import Editor, { useMonaco } from '@monaco-editor/react'
import { merge } from 'lodash'

import { editorThemeDark } from '../theme/editorThemeDark'
import { editorThemeLight } from '../theme/editorThemeLight'

import Card, { type CardProps } from './Card'
import { toFillLevel, useFillLevel } from './contexts/FillLevelContext'
import Button from './Button'

type CodeEditorProps = Omit<CardProps, 'children'> & {
  value?: string
  onChange?: Dispatch<string>
  language?: string
  options?: object
  save?: boolean
  saving?: boolean
  onSave?: Dispatch<string>
  saveLabel?: string
  height?: string | number
}

const defaultOptions = {
  fontFamily: '"Monument Mono", monospace',
  fontSize: '14px',
  padding: {
    bottom: '16px',
    top: '16px',
  },
  scrollbar: {
    useShadows: false,
    verticalScrollbarSize: 5,
  },
  scrollBeyondLastLine: false,
  // Fixes cursor alignment issues when using custom font
  fontLigatures: '',
}

export default function CodeEditor({
  value,
  onChange,
  language,
  options,
  save = false,
  saving = false,
  onSave,
  saveLabel = 'Save',
  height = '100%',
  ...props
}: CodeEditorProps) {
  const parentFillLevel = useFillLevel()
  const theme = useTheme()
  const monaco = useMonaco()
  const [current, setCurrent] = useState<string>(value)
  const [copied, setCopied] = useState<boolean>(false)
  const changed = current !== value

  const onEditorMount = useCallback(
    (editor: any) => {
      if (!monaco) return

      editor.addAction({
        id: 'remeasure-fonts',
        label: 'Remeasure Fonts',
        keybindings: [monaco?.KeyMod?.CtrlCmd | monaco?.KeyCode?.KeyB],
        run: () => monaco?.editor?.remeasureFonts(),
      })
    },
    [monaco]
  )

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(false), 1000)

      return () => clearTimeout(timeout)
    }
  }, [copied])

  useEffect(() => {
    monaco?.editor?.defineTheme('plural-dark', editorThemeDark)
    monaco?.editor?.defineTheme('plural-light', editorThemeLight)
    monaco?.editor.setTheme(
      theme.mode === 'light' ? 'plural-light' : 'plural-dark'
    )
  }, [monaco, theme.mode])

  return (
    <Card
      fillLevel={toFillLevel(Math.min(parentFillLevel + 1, 2))}
      borderColor={
        parentFillLevel >= 1
          ? theme.colors['border-fill-three']
          : theme.colors['border-fill-two']
      }
      display="flex"
      flexDirection="column"
      flexGrow={1}
      overflow="hidden"
      height={height}
      {...props}
    >
      <Div
        css={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          overflow: 'hidden',
        }}
      >
        <Editor
          language={language}
          value={value}
          onChange={(v) => {
            setCurrent(v)
            if (onChange) onChange(v)
          }}
          options={merge(defaultOptions, options)}
          theme={theme.mode === 'light' ? 'plural-light' : 'plural-dark'}
          onMount={onEditorMount}
        />
      </Div>
      {save && (
        <Flex
          align="center"
          borderTop="1px solid border"
          gap="medium"
          justify="end"
          padding="large"
        >
          {changed && <P color="text-light">Unsaved changes</P>}
          <Button
            disabled={!changed}
            loading={saving}
            onClick={() => onSave && onSave(current)}
          >
            {saveLabel}
          </Button>
        </Flex>
      )}
    </Card>
  )
}

export type { CodeEditorProps }
