import { Button, FormField, Input } from '@pluralsh/design-system'
import { Dispatch, SetStateAction, useEffect, useMemo } from 'react'

import { useTheme } from 'styled-components'
import { produce } from 'immer'
import { DeleteIconButton } from 'components/utils/IconButtons'

import { StackFileAttributes } from '../../../generated/graphql'
import { SecretsTableSC } from '../../cd/services/deployModal/DeployServiceSettingsSecrets'

export function CreateStackModalFormFiles({
  files,
  setFiles,
  setFilesErrors,
}: {
  files: StackFileAttributes[]
  setFiles: Dispatch<SetStateAction<StackFileAttributes[]>>
  setFilesErrors: Dispatch<SetStateAction<boolean>>
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

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
      }}
    >
      {files.length > 0 && (
        <SecretsTableSC>
          <thead>
            <tr>
              <th>Path</th>
              <th>Content</th>
              {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
              <th />
            </tr>
          </thead>

          <tr className="header displayContents" />
          {items.map(({ file, errors }, i) => (
            <tr
              key={i}
              className="displayContents"
            >
              {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
              <td>
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
                    inputProps={{ 'aria-label': 'Path' }}
                    onChange={(e) => {
                      setFiles((f) =>
                        produce(f, (draft) => {
                          draft[i].path = e.target.value
                        })
                      )
                    }}
                  />
                </FormField>
              </td>
              {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
              <td>
                <Input
                  value={file.content}
                  inputProps={{ 'aria-label': 'Content' }}
                  onChange={(e) =>
                    setFiles((f) =>
                      produce(f, (draft) => {
                        draft[i].content = e.target.value
                      })
                    )
                  }
                />
              </td>
              {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
              <td>
                <div css={{ display: 'flex' }}>
                  <DeleteIconButton
                    css={{ marginTop: 4 }}
                    onClick={() => {
                      setFiles((f) =>
                        produce(f, (draft) => {
                          draft.splice(i, 1)
                        })
                      )
                    }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </SecretsTableSC>
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
            setFiles((files) => [...files, { path: '', content: '' }])
          }}
        >
          Add file
        </Button>
      </div>
    </div>
  )
}
