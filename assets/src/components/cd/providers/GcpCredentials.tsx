import { useCallback, useState } from 'react'
import { FormField } from '@pluralsh/design-system'
import { FileDrop, FileDropFile } from 'components/utils/FileDrop'

import { DropzoneOptions } from 'react-dropzone'

import { isEmpty } from 'lodash'

enum FileError {
  InvalidFormat = 'Invalid file format. Expected JSON.',
  InvalidContent = "Invalid file content. Could not find 'project_id'.",
}

function GcpCredentials({
  setCreds,
}: {
  // eslint-disable-next-line react/no-unused-prop-types
  creds?: string | undefined
  setCreds: (creds: string | undefined) => void
}) {
  const [fileName, setFileName] = useState<string | undefined>()
  const [fileError, setFileError] = useState<FileError>()

  const readFile = useCallback<NonNullable<DropzoneOptions['onDrop']>>(
    async (files) => {
      if (isEmpty(files)) {
        return
      }
      const file = files?.[0]

      setFileName(file.name)

      if (file?.type !== 'application/json') {
        setFileError(FileError.InvalidFormat)
        setCreds('')

        return
      }
      const content = await file?.text()
      let credentials

      try {
        credentials = JSON.parse(content)
      } catch (e) {
        setFileError(FileError.InvalidFormat)
        setCreds('')

        return
      }

      if (!credentials?.project_id) {
        setFileError(FileError.InvalidContent)
        setFileName(file.name)
        setCreds('')

        return
      }
      setFileError(undefined)
      setCreds(content)
      setFileName(file.name)
    },
    [setCreds]
  )

  return (
    <FormField
      label="Application credentials"
      required
      error={!!fileError}
      hint={fileError}
    >
      <FileDrop
        accept={{ 'application/json': [] }}
        onDrop={readFile}
        messages={{
          default: 'Drop your GCP credentials file here',
          reject: 'File must be JSON format',
        }}
        error={!!fileError}
        files={
          !!fileName && [
            <FileDropFile
              key="file"
              label={fileName}
              onClear={() => {
                setFileName(undefined)
                setFileError(undefined)
              }}
            />,
          ]
        }
      />
    </FormField>
  )
}

export default GcpCredentials
