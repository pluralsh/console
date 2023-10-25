import { Button, CloseIcon, IconFrame } from '@pluralsh/design-system'
import isEmpty from 'lodash/isEmpty'
import { ReactElement, ReactNode } from 'react'
import { DropzoneOptions, useDropzone } from 'react-dropzone'
import styled from 'styled-components'

type DropState = Pick<
  ReturnType<typeof useDropzone>,
  | 'isDragAccept'
  | 'isDragActive'
  | 'isDragReject'
  | 'isFileDialogActive'
  | 'isFocused'
>

const FileDropFileSC = styled.div(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors.text,
  display: 'flex',
  alignItems: 'center',
  '& > .label': { flexGrow: 1 },
}))

export function FileDropFile({
  label,
  onClear,
  ...props
}: {
  label: ReactNode
  onClear: () => void
}) {
  return (
    <FileDropFileSC {...props}>
      <div className="label">{label}</div>
      {onClear && (
        <IconFrame
          clickable
          icon={<CloseIcon />}
          onClick={() => onClear()}
        />
      )}
    </FileDropFileSC>
  )
}

const FileDropSC = styled.div<{
  $dropState: DropState & {
    error?: boolean
    hasFiles?: boolean
    disabled?: boolean
  }
}>(({ theme, $dropState }) => {
  const {
    isDragAccept,
    isDragReject,
    error,
    hasFiles,
    disabled,
    isDragActive,
  } = $dropState

  return {
    '.dropRoot': {
      cursor: disabled
        ? 'not-allowed'
        : isDragActive
        ? 'copy'
        : hasFiles
        ? undefined
        : 'pointer',
      color: disabled ? theme.colors['text-disabled'] : theme.colors.text,
      display: 'flex',
      alignItems: 'center',
      columnGap: theme.spacing.small,
      minHeight: 50,
      ...theme.partials.text.body2,
      borderWidth: theme.borderWidths.default,
      borderColor: isDragAccept
        ? theme.colors['border-outline-focused']
        : error || isDragReject
        ? theme.colors['border-danger']
        : hasFiles
        ? theme.colors['border-success']
        : theme.colors['border-input'],
      borderStyle: 'dashed',
      borderRadius: theme.borderRadiuses.medium,
      padding: `${theme.spacing.xsmall}px ${theme.spacing.small}px`,
      backgroundColor: isDragAccept ? theme.colors['fill-one'] : 'transparent',

      '.textArea': {
        position: 'relative',
        flexGrow: 1,
      },
      '.filesArea': { opacity: isDragActive ? 0 : 1 },
      '.message': {
        position: 'absolute',
        display: 'flex',
        alignItems: 'center',
        top: 0,
        right: 0,
        left: 0,
        bottom: 0,
      },
      '.browseButton': {
        alignSelf: 'end',
      },
    },
    '.errorMessage': {
      ...theme.partials.text.caption,
      color: theme.colors['text-danger'],
      marginTop: theme.spacing.xxsmall,
    },
  }
})

export function FileDrop({
  multiple = false,
  maxSize = 10000,
  disabled,
  messages,
  error,
  files,
  ...props
}: DropzoneOptions & {
  messages?: {
    default?: string
    error?: boolean
    reject?: string
    accept?: string
  }
  error?: boolean
  files?: (JSX.Element | ReactElement)[] | undefined | false
}) {
  const hasFiles = !isEmpty(files)
  const noClick = hasFiles
  const { getRootProps, getInputProps, open, ...dropState } = useDropzone({
    noClick,
    multiple,
    maxSize,
    disabled,
    ...props,
  })
  const defaultMessage = 'Drop your file here'
  const finalMessages = {
    default: defaultMessage,
    error: 'File error',
    reject: 'Incorrect file type',
    browse: 'Select file',
    accept: messages?.accept ?? messages?.default ?? defaultMessage,
    ...messages,
  }

  const rootProps = getRootProps()
  const inputProps = getInputProps()
  const { isDragAccept, isDragActive, isDragReject } = dropState
  const message = isDragReject
    ? finalMessages.reject
    : isDragAccept
    ? finalMessages.accept
    : !hasFiles
    ? finalMessages.default
    : undefined

  return (
    <FileDropSC
      {...rootProps}
      $dropState={{ ...dropState, error, disabled, hasFiles }}
    >
      <div className="dropRoot">
        <input {...inputProps} />
        <div className="textArea">
          {message && <div className="message">{message}</div>}
          <div className="filesArea">{files}</div>
        </div>
        {finalMessages.browse && (
          <Button
            className="browseButton"
            secondary
            small
            disabled={isDragActive || disabled}
            onClick={noClick ? () => open() : undefined}
          >
            {finalMessages.browse}
          </Button>
        )}
      </div>
      {!!error && <div className="errorMessage">{error}</div>}
    </FileDropSC>
  )
}
