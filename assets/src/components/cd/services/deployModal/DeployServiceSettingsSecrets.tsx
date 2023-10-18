import { Button, FormField, Input } from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'
import { Dispatch, SetStateAction, useEffect, useMemo } from 'react'
import { produce } from 'immer'
import { DeleteIconButton } from 'components/utils/IconButtons'

export type Secret = { name: string; value: string }

export const SecretsTableSC = styled.table(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr auto',
  rowGap: theme.spacing.medium,
  columnGap: theme.spacing.xsmall,
  alignItems: 'stretch',
  'tr, tbody, thead': {
    display: 'contents',
  },
  'thead th': {
    ...theme.partials.text.body2Bold,
    marginBottom: -theme.spacing.xsmall,
  },
  th: {
    display: 'block',
    textAlign: 'left',
  },
  button: {
    alignSelf: 'center',
  },
}))

export function DeployServiceSettingsSecrets({
  secrets,
  setSecrets,
  setSecretsErrors,
}: {
  secrets: Secret[]
  setSecrets: Dispatch<SetStateAction<Secret[]>>
  setSecretsErrors: Dispatch<SetStateAction<boolean>>
}) {
  const theme = useTheme()

  const { items, errorCount } = useMemo(() => {
    const names = new Set<string>()
    let errorCount = 0

    const items = secrets.map((secret) => {
      const duplicate = names.has(secret.name) && !!secret.name

      names.add(secret.name)

      const noName = !!secret.value && !secret.name

      if (duplicate || noName) {
        errorCount++
      }

      return {
        secret,
        errors: {
          duplicate,
          noName,
        },
      }
    })

    return { items, errorCount }
  }, [secrets])

  useEffect(() => {
    setSecretsErrors(errorCount > 0)
  }, [errorCount, setSecretsErrors])

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
      }}
    >
      {secrets.length > 0 && (
        <SecretsTableSC>
          <thead>
            <tr />
            <th>Name</th>
            <th>Value</th>
            {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
            <th />
          </thead>

          <tr className="header displayContents" />
          {items.map(({ secret, errors }, i) => (
            <tr
              key={i}
              className="displayContents"
            >
              <th>
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
                    value={secret.name}
                    inputProps={{ 'aria-label': 'Name' }}
                    onChange={(e) => {
                      setSecrets((secrets) =>
                        produce(secrets, (draft) => {
                          draft[i].name = e.target.value
                        })
                      )
                    }}
                  />
                </FormField>
              </th>
              <th>
                <Input
                  value={secret.value}
                  inputProps={{ 'aria-label': 'Value' }}
                  onChange={(e) =>
                    setSecrets((secrets) =>
                      produce(secrets, (draft) => {
                        draft[i].value = e.target.value
                      })
                    )
                  }
                />
              </th>
              <th>
                <DeleteIconButton
                  css={{ marginTop: 4 }}
                  onClick={() => {
                    setSecrets((secrets) =>
                      produce(secrets, (draft) => {
                        draft.splice(i, 1)
                      })
                    )
                  }}
                />
              </th>
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
            setSecrets((secrets) => [...secrets, { name: '', value: '' }])
          }}
        >
          Add secret
        </Button>
      </div>
    </div>
  )
}
