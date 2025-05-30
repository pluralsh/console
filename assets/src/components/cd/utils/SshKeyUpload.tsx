import { useCallback, useEffect, useState } from 'react'
import {
  FillLevel,
  FormField,
  Input,
  usePrevious,
} from '@pluralsh/design-system'
import { FileDrop, FileDropFile } from 'components/utils/FileDrop'
import { InlineLink } from 'components/utils/typography/InlineLink'

import { DropzoneOptions } from 'react-dropzone'

import { isEmpty } from 'lodash'
import { FillLevelDiv } from 'components/utils/FillLevelDiv'

function SshKeyUpload({
  privateKey,
  setPrivateKey,
  label,
  required = true,
  fillLevel = 1,
}: {
  privateKey?: Nullable<string>
  setPrivateKey: (value: Nullable<string>) => void
  label?: string
  required?: boolean
  fillLevel?: FillLevel
}) {
  const [fileName, setFileName] = useState<string | undefined>()
  const [fileError, setFileError] = useState<Nullable<string>>()
  const [manual, setManual] = useState(false)
  const wasManual = usePrevious(manual)

  useEffect(() => {
    if (manual && !wasManual) {
      setFileName(undefined)
      setFileError(undefined)
    } else if (!manual && wasManual) {
      setPrivateKey(undefined)
    }
  }, [manual, setPrivateKey, wasManual])

  const readFile = useCallback<NonNullable<DropzoneOptions['onDrop']>>(
    async (files) => {
      if (isEmpty(files)) {
        return
      }
      const file = files?.[0]
      const content = await file?.text()

      if (!content) {
        setFileError('File is empty')
        setFileName(file.name)
        setPrivateKey('')

        return
      }
      setFileError(undefined)
      setPrivateKey(content)
      setFileName(file.name)
    },
    [setPrivateKey]
  )

  return (
    <FormField
      label={label ?? 'Private key'}
      required={required}
      error={!!fileError}
      hint={fileError}
      caption={
        <InlineLink
          css={{ cursor: 'pointer' }}
          onClick={(e) => {
            e.preventDefault()
            setManual(!manual)
          }}
        >
          {manual ? 'Upload file' : 'Enter manually'}
        </InlineLink>
      }
    >
      {manual ? (
        <Input
          multiline
          minRows={2}
          maxRows={4}
          value={privateKey}
          placeholder="Private key"
          onChange={(e) => {
            setPrivateKey(e.currentTarget.value)
          }}
        />
      ) : (
        <FillLevelDiv fillLevel={fillLevel}>
          <FileDrop
            onDrop={readFile}
            messages={{
              default: 'Drop your private key file here',
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
        </FillLevelDiv>
      )}
    </FormField>
  )
}

export default SshKeyUpload
