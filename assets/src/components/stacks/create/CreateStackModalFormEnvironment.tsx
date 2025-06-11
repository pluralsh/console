import {
  Button,
  EmptyState,
  FormField,
  Input,
  Switch,
} from '@pluralsh/design-system'
import { Dispatch, SetStateAction, useEffect, useMemo } from 'react'

import { useTheme } from 'styled-components'
import { produce } from 'immer'
import { DeleteIconButton } from 'components/utils/IconButtons'

import { StackEnvironmentAttributes } from '../../../generated/graphql'
import { SecretsTableSC } from '../../cd/services/deployModal/DeployServiceSettingsSecrets'

export function CreateStackModalFormEnvironment({
  environment,
  setEnvironment,
  setEnvironmentErrors,
}: {
  environment: StackEnvironmentAttributes[]
  setEnvironment: Dispatch<SetStateAction<StackEnvironmentAttributes[]>>
  setEnvironmentErrors: Dispatch<SetStateAction<boolean>>
}) {
  const theme = useTheme()

  const { items, errorCount } = useMemo(() => {
    const names = new Set<string>()
    let errorCount = 0

    const items = environment.map((env) => {
      const duplicate = names.has(env.name) && !!env.name

      names.add(env.name)

      const noName = !!env.value && !env.name

      if (duplicate || noName) {
        errorCount++
      }

      return {
        env,
        errors: {
          duplicate,
          noName,
        },
      }
    })

    return { items, errorCount }
  }, [environment])

  useEffect(
    () => setEnvironmentErrors(errorCount > 0),
    [errorCount, setEnvironmentErrors]
  )

  const addButton = useMemo(
    () => (
      <Button
        secondary
        small
        onClick={(e) => {
          e.preventDefault()
          setEnvironment((env) => [...env, { name: '', value: '' }])
        }}
      >
        Add environment variable
      </Button>
    ),
    [setEnvironment]
  )

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
      }}
    >
      {environment.length > 0 ? (
        <>
          <SecretsTableSC>
            <thead>
              <tr>
                <th>Name</th>
                <th>Value</th>
                <th>Secret</th>
              </tr>
            </thead>

            <tbody>
              <tr className="header displayContents" />
              {items.map(({ env, errors }, i) => (
                <tr
                  key={i}
                  className="displayContents"
                >
                  <td>
                    <FormField
                      error={errors.duplicate || errors.noName}
                      hint={
                        errors.noName
                          ? 'Name cannot be empty'
                          : errors.duplicate
                            ? 'Duplicate name'
                            : undefined
                      }
                    >
                      <Input
                        error={errors.duplicate || errors.noName}
                        value={env.name}
                        inputProps={{ 'aria-label': 'Name' }}
                        onChange={(e) => {
                          setEnvironment((env) =>
                            produce(env, (draft) => {
                              draft[i].name = e.target.value
                            })
                          )
                        }}
                      />
                    </FormField>
                  </td>
                  <td>
                    <Input
                      value={env.value}
                      type={env?.secret ? 'password' : 'text'}
                      inputProps={{ 'aria-label': 'Value' }}
                      onChange={(e) =>
                        setEnvironment((env) =>
                          produce(env, (draft) => {
                            draft[i].value = e.target.value
                          })
                        )
                      }
                    />
                  </td>
                  <td>
                    <div css={{ display: 'flex' }}>
                      <Switch
                        checked={!!env?.secret}
                        onChange={(e) =>
                          setEnvironment((env) =>
                            produce(env, (draft) => {
                              draft[i].secret = e
                            })
                          )
                        }
                      />
                      <DeleteIconButton
                        css={{ marginTop: 4 }}
                        onClick={() => {
                          setEnvironment((env) =>
                            produce(env, (draft) => {
                              draft.splice(i, 1)
                            })
                          )
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </SecretsTableSC>
          <div>{addButton}</div>
        </>
      ) : (
        <EmptyState message="No environment variables.">{addButton}</EmptyState>
      )}
    </div>
  )
}
