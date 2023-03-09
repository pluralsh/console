import { ComponentProps, useCallback, useState } from 'react'
import { Span } from 'honorable'
import { CloseIcon } from '@pluralsh/design-system'
import { FileInput, ThemeContext } from 'grommet'
import { useTheme } from 'styled-components'

export const fileInputTheme = ({
  selected = false, error = false, theme,
}: {
  selected?: boolean;
  error?: boolean;
  theme: any;
}) => ({
  fileInput: {
    message: {
      size: 'small',
    },
    hover: {
      border: {
        color: error
          ? theme.colors['border-error']
          : selected
            ? theme.colors['border-success']
            : theme.colors['border-input'],
      },
      background: {
        color: theme.colors['fill-one-hover'],
        opacity: 1,
      },
    },
    dragOver: {
      border: {
        color: theme.colors['border-outline-focused'],
      },
      background: {
        color: theme.colors['fill-one-hover'],
        opacity: 1,
      },
    },
    background: {
      color: theme.colors['fill-one'],
      opacity: 1,
    },
    round: {
      size: `${theme.borderRadiuses.medium}px`,
    },
    border: {
      size: `${theme.borderWidths.default}px`,
      opacity: false,
      color: error
        ? theme.colors['border-error']
        : selected
          ? theme.colors['border-success']
          : theme.colors['border-input'],
    },
    icons: {
      remove: CloseIcon,
    },
  },
})

export default function ConfigurationFileInput({
  onChange, ...props
}: { onChange: (f:{file: File | null, text: string}) => void; } & Omit<
  ComponentProps<typeof FileInput>, 'onChange'
>) {
  const [fileSelected, setFileSelected] = useState<boolean>()
  const theme = useTheme()

  const readFile = useCallback(async (files: FileList | undefined | null) => {
    setFileSelected(false)

    const file = files?.item(0) ?? null
    const text = await file?.text() ?? ''

    setFileSelected(!!file)
    onChange({ text, file })
  },
  [onChange])

  return (
    <ThemeContext.Extend value={fileInputTheme({ selected: fileSelected, theme })}>
      <FileInput
        messages={{
          dropPrompt: 'Drop your file here',
          browse: 'Select file',
        }}
        multiple={false}
        onChange={event => readFile(event?.target?.files)}
        renderFile={file => (
          <Span
            margin="small"
            color="text-light"
          >
            {file.name}
          </Span>
        )}
        {...props}
      />
    </ThemeContext.Extend>
  )
}
