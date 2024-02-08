import { useTheme } from 'styled-components'
import { useState } from 'react'
import { Button, Card, Chip, FormField, Input } from '@pluralsh/design-system'
import { isEmpty } from 'lodash'

import { DeleteIconButton } from '../utils/IconButtons'
import { ChipList } from '../cd/services/CreateGlobalService'

import { Scope } from './AccessTokensCreate'

export function AccessTokensCreateScope({
  scope,
  setScope,
  index,
  remove,
  canRemove,
}: {
  scope: Scope
  setScope: any
  index: number
  remove: any
  canRemove: boolean
}) {
  const theme = useTheme()
  const [api, setApi] = useState('')
  const [id, setId] = useState('')

  return (
    <Card
      css={{
        '&&': {
          marginTop: theme.spacing.medium,
          padding: theme.spacing.medium,
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.medium,
        },
      }}
      fillLevel={2}
    >
      <div
        css={{
          ...theme.partials.text.overline,
          alignItems: 'center',
          color: theme.colors['text-xlight'],
          display: 'flex',
          flexGrow: 1,
          justifyContent: 'space-between',
        }}
      >
        <span>Scope #{index + 1}</span>
        <DeleteIconButton
          onClick={remove}
          tooltip={canRemove}
          disabled={!canRemove}
        />
      </div>
      <div>
        <FormField
          label="API"
          hint="Choose at least one API, i.e. updateServiceDeployment."
          required
        >
          <div css={{ display: 'flex', flexGrow: 1, gap: theme.spacing.small }}>
            <Input
              flexGrow={1}
              value={api}
              onChange={(e) => {
                setApi(e.currentTarget.value)
              }}
            />
            <Button secondary>Add</Button>
          </div>
        </FormField>
        {!isEmpty(scope.apis) && (
          <ChipList
            maxVisible={Infinity}
            chips={scope.apis.map((a) => (
              <Chip
                size="small"
                clickable
                // onClick={() => onRemove(key)}
                closeButton
              >
                {a}
              </Chip>
            ))}
          />
        )}
      </div>
      <div>
        <FormField
          label="ID"
          hint="Choose at least one ID. Leave it blank or use * to match all resources."
        >
          <div css={{ display: 'flex', flexGrow: 1, gap: theme.spacing.small }}>
            <Input
              flexGrow={1}
              value={id}
              onChange={(e) => {
                setId(e.currentTarget.value)
              }}
            />
            <Button secondary>Add</Button>
          </div>
        </FormField>
        {!isEmpty(scope.ids) && (
          <ChipList
            maxVisible={Infinity}
            chips={scope.ids.map((identifier, i) => (
              <Chip
                size="small"
                clickable
                onClick={() => {
                  const nextScope = scope

                  nextScope.ids.splice(i, 1)

                  setScope(nextScope)
                }}
                closeButton
              >
                {identifier}
              </Chip>
            ))}
          />
        )}
      </div>
    </Card>
  )
}
