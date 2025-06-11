import {
  Button,
  Card,
  EmptyState,
  FormField,
  Input,
} from '@pluralsh/design-system'
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
} from 'react'

import { useTheme } from 'styled-components'
import { produce } from 'immer'
import { DeleteIconButton } from 'components/utils/IconButtons'

import { isEmpty } from 'lodash'

import { FileDrop, FileDropFile } from '../../utils/FileDrop'

import { StackFileAttributesExtended } from './CreateStackModal'

export function CreateStackModalFormFiles({
  files,
  setFiles,
  setFilesErrors,
  loading,
}: {
  files: StackFileAttributesExtended[]
  setFiles: Dispatch<SetStateAction<StackFileAttributesExtended[]>>
  setFilesErrors: Dispatch<SetStateAction<boolean>>
  loading: boolean
}) {
  const theme = useTheme()

  const { items, errorCount } = useMemo(() => {
    const paths = new Set<string>()
    let errorCount = 0

    const items = files.map((file) => {
      const duplicate = paths.has(file.path) && !!file.path

      paths.add(file.path)

      const noPath = !!file.content && !file.path

      if (duplicate || noPath) {
        errorCount++
      }

      return {
        file,
        errors: {
          duplicate,
          noPath,
        },
      }
    })

    return { items, errorCount }
  }, [files])

  useEffect(() => setFilesErrors(errorCount > 0), [errorCount, setFilesErrors])

  const addButton = useMemo(
    () => (
      <Button
        secondary
        small
        disabled={loading}
        onClick={(e) => {
          e.preventDefault()
          setFiles((files) => [...files, { path: '', content: '' }])
        }}
      >
        Add file
      </Button>
    ),
    [loading, setFiles]
  )

  const readFile = useCallback(
    async (files, i) => {
      if (isEmpty(files)) return

      const file = files?.[0]
      const content = await file?.text()

      setFiles((f) =>
        produce(f, (draft) => {
          draft[i].name = file.name
          draft[i].content = content
        })
      )
    },
    [setFiles]
  )

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.medium,
      }}
    >
      {files.length > 0 ? (
        <>
          {items.map(({ file, errors }, i) => (
            <Card
              fillLevel={2}
              key={i}
              css={{
                padding: theme.spacing.medium,
                display: 'flex',
                flexDirection: 'column',
                gap: theme.spacing.small,
              }}
            >
              <FormField
                error={errors.duplicate || errors.noPath}
                hint={
                  errors.noPath
                    ? 'Path cannot be empty'
                    : errors.duplicate
                      ? 'Duplicate path'
                      : undefined
                }
              >
                <Input
                  error={errors.duplicate || errors.noPath}
                  value={file.path}
                  inputProps={{ 'aria-label': 'Mount path' }}
                  placeholder="Mount path"
                  onChange={(e) => {
                    setFiles((f) =>
                      produce(f, (draft) => {
                        draft[i].path = e.target.value
                      })
                    )
                  }}
                />
              </FormField>
              <div
                css={{
                  alignItems: 'center',
                  display: 'flex',
                  gap: theme.spacing.small,
                }}
              >
                <FileDrop
                  onDrop={(files) => readFile(files, i)}
                  files={
                    !!file.content && [
                      <FileDropFile
                        key="file"
                        label={file.name ?? 'Selected file'}
                        onClear={() => {
                          setFiles((f) =>
                            produce(f, (draft) => {
                              draft[i].content = ''
                            })
                          )
                        }}
                      />,
                    ]
                  }
                />
                <DeleteIconButton
                  tooltip="Delete"
                  onClick={() => {
                    setFiles((f) =>
                      produce(f, (draft) => {
                        draft.splice(i, 1)
                      })
                    )
                  }}
                />
              </div>
            </Card>
          ))}
          <div>{addButton}</div>
        </>
      ) : (
        <EmptyState message="No files.">{addButton}</EmptyState>
      )}
    </div>
  )
}
