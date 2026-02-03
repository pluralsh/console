import {
  Button,
  Card,
  Chip,
  CloseIcon,
  FormField,
  IconFrame,
  Input,
} from '@pluralsh/design-system'
import { isEmpty } from 'lodash'
import { useState } from 'react'
import { useTheme } from 'styled-components'

import { ChipList } from 'components/cd/services/CreateGlobalService'

import { ScopeAttributes } from 'generated/graphql'
import { produce } from 'immer'

export function AccessTokensCreateScope({
  scope,
  setScope,
  remove,
  canRemove,
}: {
  scope: ScopeAttributes
  setScope: (s: ScopeAttributes) => void
  remove: () => void
  canRemove: boolean
}) {
  const theme = useTheme()

  const [api, setApi] = useState('')
  const [id, setId] = useState('')

  const updateScope = (updater: (draft: ScopeAttributes) => void) =>
    setScope(produce(scope, updater))

  const addItem = (field: 'apis' | 'ids', value: string) => {
    updateScope((draft) => {
      draft[field]?.push(value)
    })
    if (field === 'apis') setApi('')
    else if (field === 'ids') setId('')
  }
  const removeItem = (field: 'apis' | 'ids', i: number) =>
    updateScope((draft) => {
      draft[field]?.splice(i, 1)
    })

  return (
    <Card
      css={{
        '&&': {
          marginTop: theme.spacing.medium,
          padding: theme.spacing.medium,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        },
      }}
      fillLevel={2}
    >
      <IconFrame
        size="small"
        clickable
        tooltip
        disabled={!canRemove}
        onClick={remove}
        icon={<CloseIcon />}
        textValue="Delete"
        css={{
          color: canRemove
            ? theme.colors['icon-xlight']
            : theme.colors['icon-disabled'],
          position: 'absolute',
          right: theme.spacing.medium,
          top: theme.spacing.medium,
        }}
      />
      <FormField
        label="API"
        hint="Add at least one API (e.g. updateServiceDeployment)."
        marginTop="small"
        error={isEmpty(scope.apis)}
        required
      >
        <div css={{ display: 'flex', flexGrow: 1, gap: theme.spacing.small }}>
          <Input
            flexGrow={1}
            value={api}
            error={isEmpty(scope.apis)}
            onChange={(e) => setApi(e.currentTarget.value)}
          />
          <Button
            secondary
            disabled={isEmpty(api)}
            onClick={() => addItem('apis', api)}
          >
            Add
          </Button>
        </div>
      </FormField>
      {!isEmpty(scope.apis) && (
        <ChipList
          maxVisible={Infinity}
          chips={
            scope.apis?.map((a, idx) => (
              <Chip
                size="small"
                clickable
                onClick={() => removeItem('apis', idx)}
                closeButton
              >
                {a}
              </Chip>
            )) ?? []
          }
        />
      )}
      <FormField
        label="ID"
        hint="Add resource identifiers. Leave it blank or use * to match all resources."
        marginTop="small"
      >
        <div css={{ display: 'flex', flexGrow: 1, gap: theme.spacing.small }}>
          <Input
            flexGrow={1}
            value={id}
            onChange={(e) => setId(e.currentTarget.value)}
          />
          <Button
            secondary
            type="button"
            disabled={isEmpty(id)}
            onClick={() => addItem('ids', id)}
          >
            Add
          </Button>
        </div>
      </FormField>
      {!isEmpty(scope.ids) && (
        <ChipList
          maxVisible={Infinity}
          chips={
            scope.ids?.map((i, idx) => (
              <Chip
                size="small"
                clickable
                onClick={() => removeItem('ids', idx)}
                closeButton
              >
                {i}
              </Chip>
            )) ?? []
          }
        />
      )}
    </Card>
  )
}
