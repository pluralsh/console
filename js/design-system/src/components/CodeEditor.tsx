import { type Dispatch, useCallback, useEffect, useMemo, useState } from 'react'
import Flex from './Flex'
import styled, { useTheme } from 'styled-components'

import Editor, { useMonaco, type EditorProps } from '@monaco-editor/react'
import { merge } from 'lodash'

import { editorThemeDark } from '../theme/editorThemeDark'
import { editorThemeLight } from '../theme/editorThemeLight'

import Card, { type CardProps } from './Card'
import { toFillLevel, useFillLevel } from './contexts/FillLevelContext'
import Button from './Button'
import { registerRegoLanguage } from './registerRegoLanguage'

type CodeEditorProps = Omit<CardProps, 'children'> & {
  value?: string
  onChange?: Dispatch<string>
  language?: string
  options?: EditorProps['options']
  save?: boolean
  saving?: boolean
  onSave?: Dispatch<string>
  saveLabel?: string
  height?: string | number
}

const defaultOptions: EditorProps['options'] = {
  fontFamily: 'ui-monospace, monospace',
  fontSize: 14,
  padding: { bottom: 16, top: 16 },
  scrollbar: { useShadows: false, verticalScrollbarSize: 5 },
  scrollBeyondLastLine: false,
  fontLigatures: false,
  automaticLayout: true,
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
  const [current, setCurrent] = useState<string>(value ?? '')
  const [copied, setCopied] = useState<boolean>(false)
  const changed = current !== (value ?? '')

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
    if (!monaco) return

    registerRegoLanguage(monaco)
    monaco.editor.defineTheme('plural-dark', editorThemeDark)
    monaco.editor.defineTheme('plural-light', editorThemeLight)
    monaco.editor.setTheme(
      theme.mode === 'light' ? 'plural-light' : 'plural-dark'
    )
  }, [monaco, theme.mode])

  const mergedOptions = useMemo(
    () => merge({}, defaultOptions, options),
    [options]
  )

  return (
    <Card
      fillLevel={toFillLevel(Math.min(parentFillLevel + 1, 2))}
      css={{
        borderColor:
          parentFillLevel >= 1
            ? theme.colors['border-fill-three']
            : theme.colors['border-fill-two'],
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        overflow: 'hidden',
        height,
      }}
      {...props}
    >
      <Flex
        direction="column"
        flexGrow={1}
        overflow="hidden"
      >
        <Editor
          language={language}
          value={value}
          onChange={(v) => {
            setCurrent(v ?? '')
            if (onChange) onChange(v ?? '')
          }}
          options={mergedOptions}
          theme={theme.mode === 'light' ? 'plural-light' : 'plural-dark'}
          onMount={onEditorMount}
        />
      </Flex>
      {save && (
        <Flex
          align="center"
          css={{ borderTop: theme.borders.default }}
          gap="medium"
          justify="end"
          padding="large"
        >
          {changed && <UnsavedSC>Unsaved changes</UnsavedSC>}
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

const UnsavedSC = styled.p(({ theme }) => ({
  margin: 0,
  ...theme.partials.text.body2,
  color: theme.colors['text-light'],
}))

export type { CodeEditorProps }
