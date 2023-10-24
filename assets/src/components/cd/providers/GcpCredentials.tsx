import { useCallback, useState } from 'react'
import { Div } from 'honorable'
import { FormField } from '@pluralsh/design-system'
import { FileInput } from 'grommet'
import { ThemeContext } from 'grommet/contexts'

import styled, { useTheme } from 'styled-components'

import { fileInputTheme } from './fileInputTheme'

enum FileError {
  InvalidFormat = 'Invalid file format. Expected JSON.',
  InvalidContent = "Invalid file content. Could not find 'project_id'.",
}

const FileNameSC = styled.span(({ theme }) => ({
  margin: theme.spacing.small,
  color: theme.colors['text-light'],
}))

function GcpCredentials({
  creds,
  setCreds,
}: {
  creds: string | undefined
  setCreds: (creds: string | undefined) => void
}) {
  const theme = useTheme()

  console.log('credszzzz', creds)

  const [fileName, setFileName] = useState<string | undefined>()
  const [fileError, setFileError] = useState<FileError>()

  const fileSelected = !!creds

  const readFile = useCallback(
    async (files: FileList | undefined | null) => {
      setFileError(undefined)
      setFileName(undefined)
      setCreds(undefined)

      if (files?.length === 0) return

      const file = files?.item(0)

      if (file?.type !== 'application/json') {
        setFileError(FileError.InvalidFormat)

        return
      }

      const content = await file?.text()
      const credentials = JSON.parse(content)

      if (!credentials.project_id) {
        setFileError(FileError.InvalidContent)

        return
      }

      setCreds(content)
      setFileName(file.name)
    },
    [setCreds]
  )

  return (
    <FormField
      label="Application credentials"
      required
    >
      <ThemeContext.Extend
        value={fileInputTheme({
          selected: fileSelected,
          error: !!fileError,
          theme,
        })}
      >
        <FileInput
          value={fileName || undefined}
          messages={{
            dropPrompt: 'Drop your service account credentials file here',
            browse: 'Select file',
          }}
          onChange={(event) => readFile(event?.target?.files)}
          renderFile={(file) => <FileNameSC>{file?.name}</FileNameSC>}
        />
      </ThemeContext.Extend>
      {!!fileError && (
        <Div
          marginTop="xxsmall"
          fontSize="small"
          color="error"
        >
          {fileError}
        </Div>
      )}
    </FormField>
  )
}

export default GcpCredentials
