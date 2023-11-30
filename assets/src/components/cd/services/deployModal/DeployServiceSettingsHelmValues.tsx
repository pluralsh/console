import { Button, FormField, Input } from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'
import { Dispatch, SetStateAction, useEffect, useMemo } from 'react'
import { produce } from 'immer'
import { DeleteIconButton } from 'components/utils/IconButtons'

export type HelmValue = { name: string; value: string }

export const HelmValuesTableSC = styled.table(({ theme }) => ({
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

export function DeployServiceSettingsHelmValues({
  helmValues,
  setHelmValues,
  setHelmValuesErrors,
}: {
  helmValues: HelmValue[]
  setHelmValues: Dispatch<SetStateAction<HelmValue[]>>
  setHelmValuesErrors: Dispatch<SetStateAction<boolean>>
}) {
  const theme = useTheme()

  const { items, errorCount } = useMemo(() => {
    const names = new Set<string>()
    let errorCount = 0

    const items = helmValues.map((helmValue) => {
      const duplicate = names.has(helmValue.name) && !!helmValue.name

      names.add(helmValue.name)

      const noName = !!helmValue.value && !helmValue.name

      if (duplicate || noName) {
        errorCount++
      }

      return {
        helmValue,
        errors: {
          duplicate,
          noName,
        },
      }
    })

    return { items, errorCount }
  }, [helmValues])

  useEffect(() => {
    setHelmValuesErrors(errorCount > 0)
  }, [errorCount, setHelmValuesErrors])

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
      }}
    >
      {helmValues.length > 0 && (
        <HelmValuesTableSC>
          <thead>
            <tr />
            <th>Name</th>
            <th>Value</th>
            {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
            <th />
          </thead>

          <tr className="header displayContents" />
          {items.map(({ helmValue, errors }, i) => (
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
                    value={helmValue.name}
                    inputProps={{ 'aria-label': 'Name' }}
                    onChange={(e) => {
                      setHelmValues((helmValues) =>
                        produce(helmValues, (draft) => {
                          draft[i].name = e.target.value
                        })
                      )
                    }}
                  />
                </FormField>
              </th>
              <th>
                <Input
                  //   defaultRevealed={false}
                  value={helmValue.value}
                  inputProps={{ 'aria-label': 'Value' }}
                  onChange={(e) =>
                    setHelmValues((helmValues) =>
                      produce(helmValues, (draft) => {
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
                    setHelmValues((helmValues) =>
                      produce(helmValues, (draft) => {
                        draft.splice(i, 1)
                      })
                    )
                  }}
                />
              </th>
            </tr>
          ))}
        </HelmValuesTableSC>
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
            setHelmValues((helmValues) => [
              ...helmValues,
              { name: '', value: '' },
            ])
          }}
        >
          Add value
        </Button>
      </div>
    </div>
  )
}
