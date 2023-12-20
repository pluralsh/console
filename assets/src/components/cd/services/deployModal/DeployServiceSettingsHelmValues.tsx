import { Button, CodeEditor, FormField, Input } from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'
import {
  Dispatch,
  SetStateAction,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useVisuallyHidden } from 'react-aria'
import { produce } from 'immer'
import { DeleteIconButton } from 'components/utils/IconButtons'
import { FileDrop, FileDropFile } from 'components/utils/FileDrop'
import isEmpty from 'lodash/isEmpty'
import { InlineLink } from 'components/utils/typography/InlineLink'
import { DropzoneOptions } from 'react-dropzone'

export const HelmValuesFilesTableSC = styled.table(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  rowGap: theme.spacing.xsmall,
  columnGap: theme.spacing.xsmall,
  alignItems: 'stretch',
  'tr, tbody, thead': {
    display: 'contents',
  },
  'thead th': {
    ...theme.partials.text.body2Bold,
    // marginBottom: -theme.spacing.xxxsmall,
  },
  th: {
    display: 'block',
    textAlign: 'left',
  },
  button: {
    alignSelf: 'center',
  },
}))

type Variant = 'large' | 'modal'
type Options = { variant?: Variant }

export function ServiceSettingsHelmValues({
  helmValuesFiles,
  setHelmValuesFiles,
  helmValues,
  setHelmValues,
  setHelmValuesErrors,
  options,
}: {
  helmValuesFiles: string[]
  setHelmValuesFiles: Dispatch<SetStateAction<string[]>>
  helmValues: string
  setHelmValues: Dispatch<SetStateAction<string>>
  setHelmValuesErrors: Dispatch<SetStateAction<boolean>>
  options?: Options
}) {
  const theme = useTheme()
  const opts: Required<Options> = { variant: 'modal', ...(options || {}) }

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.large,
      }}
    >
      <HelmValuesFilesInput
        {...{
          helmValues,
          helmValuesFiles,
          setHelmValuesFiles,
          setHelmValuesErrors,
        }}
      />
      <HelmValuesInput
        helmValues={helmValues}
        setHelmValues={setHelmValues}
        variant={opts.variant}
      />
    </div>
  )
}

const HelmValuesInput = memo(
  ({
    helmValues,
    setHelmValues,
    variant = 'modal',
  }: {
    helmValues: string
    setHelmValues: Dispatch<SetStateAction<string>>
    variant: 'large' | 'modal'
  }) => {
    const [manual, setManual] = useState(true)
    const [fileName, setFileName] = useState<string | undefined>()
    const [fileError, setFileError] = useState<Nullable<string>>()

    useEffect(() => {
      if (manual) {
        setFileName(undefined)
        setFileError(undefined)
      }
    }, [manual])

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

          return
        }
        setFileError(undefined)
        setFileName(file.name)
        setHelmValues(content)
        setManual(true)
      },
      [setHelmValues]
    )

    return (
      <FormField
        label="Raw YAML values"
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
          <CodeEditor
            value={helmValues}
            language="yaml"
            height={variant === 'large' ? 300 : 200}
            options={{ lineNumbers: false, minimap: { enabled: false } }}
            onChange={(value) => {
              setHelmValues(value)
            }}
          />
        ) : (
          <FileDrop
            onDrop={readFile}
            messages={{
              default: 'Drop your values file here',
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
        )}
      </FormField>
    )
  }
)

const HelmValuesFilesInput = memo(
  ({
    helmValuesFiles,
    setHelmValuesFiles,
    setHelmValuesErrors,
  }: {
    helmValuesFiles: (string | null)[]
    setHelmValuesFiles: Dispatch<SetStateAction<string[]>>
    setHelmValuesErrors: Dispatch<SetStateAction<boolean>>
  }) => {
    const theme = useTheme()
    const { visuallyHiddenProps } = useVisuallyHidden()
    const { fileItems, errorCount } = useMemo(() => {
      const filesSet = new Set<string>()
      let errorCount = 0

      const items = helmValuesFiles?.map((file) => {
        const duplicate = !!file && filesSet.has(file)

        if (file) {
          filesSet.add(file)
        }

        if (duplicate) {
          errorCount++
        }

        return {
          valuesFile: file,
          errors: {
            duplicate,
          },
        }
      })

      return { fileItems: items, errorCount }
    }, [helmValuesFiles])

    useEffect(() => {
      setHelmValuesErrors(errorCount > 0)
    }, [errorCount, setHelmValuesErrors])

    const HelmValuesFilesInput = (
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.xsmall,
        }}
      >
        {helmValuesFiles?.length > 0 && (
          <HelmValuesFilesTableSC>
            <thead>
              <tr>
                <th>Paths to YAML values files</th>
                <th css={{}}>
                  <span {...visuallyHiddenProps}>Actions</span>
                </th>
              </tr>
            </thead>

            <tr className="header displayContents" />
            {fileItems?.map(({ valuesFile, errors }, i) => (
              <tr
                key={i}
                className="displayContents"
              >
                {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
                <th>
                  <FormField
                    error={errors.duplicate}
                    hint={errors.duplicate ? 'Duplicate file path' : undefined}
                  >
                    <Input
                      error={errors.duplicate}
                      value={valuesFile}
                      inputProps={{ 'aria-label': 'Name' }}
                      onChange={(e) => {
                        setHelmValuesFiles((helmValues) =>
                          produce(helmValues, (draft) => {
                            draft[i] = e.target.value
                          })
                        )
                      }}
                    />
                  </FormField>
                </th>
                {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
                <th>
                  <DeleteIconButton
                    disabled={i === 0 && !valuesFile}
                    css={{ marginTop: 4 }}
                    onClick={() => {
                      setHelmValuesFiles((helmValues) =>
                        produce(helmValues, (draft) => {
                          draft.splice(i, 1)
                          if (draft.length === 0) {
                            draft.push('')
                          }
                        })
                      )
                    }}
                  />
                </th>
              </tr>
            ))}
          </HelmValuesFilesTableSC>
        )}
        <div css={{ display: 'flex' }}>
          <Button
            css={{ flexGrow: 0, width: 'auto' }}
            type="button"
            secondary
            small
            size="tertiary"
            onClick={(e) => {
              e.preventDefault()
              setHelmValuesFiles((helmValues) => [...helmValues, ''])
            }}
          >
            Add file
          </Button>
        </div>
      </div>
    )

    return HelmValuesFilesInput
  }
)
