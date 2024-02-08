import { useTheme } from 'styled-components'
import { useCallback, useState } from 'react'
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

  const addApi = useCallback(() => {
    const next = scope

    next.apis = [...next.apis, api]
    setScope(next)
    setApi('')
  }, [scope, setScope, api, setApi])
  const removeApi = useCallback(
    (i: number) => {
      const next = scope

      next.apis.splice(i, 1)
      setScope(next)
    },
    [scope, setScope]
  )
  const addId = useCallback(() => {
    const next = scope

    next.ids = [...next.ids, id]
    setScope(next)
    setId('')
  }, [scope, setScope, id, setId])
  const removeId = useCallback(
    (i: number) => {
      const next = scope

      next.ids.splice(i, 1)
      setScope(next)
    },
    [scope, setScope]
  )

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
          hint="Add at least one API, i.e. updateServiceDeployment."
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
              onClick={addApi}
            >
              Add
            </Button>
          </div>
        </FormField>
        {!isEmpty(scope.apis) && (
          <ChipList
            maxVisible={Infinity}
            chips={scope.apis.map((a, idx) => (
              <Chip
                size="small"
                clickable
                onClick={() => removeApi(idx)}
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
          hint="Add resource identifiers. Leave it blank or use * to match all resources."
        >
          <div css={{ display: 'flex', flexGrow: 1, gap: theme.spacing.small }}>
            <Input
              flexGrow={1}
              value={id}
              onChange={(e) => {
                setId(e.currentTarget.value)
              }}
            />
            <Button
              secondary
              disabled={isEmpty(id)}
              onClick={addId}
            >
              Add
            </Button>
          </div>
        </FormField>
        {!isEmpty(scope.ids) && (
          <ChipList
            maxVisible={Infinity}
            chips={scope.ids.map((i, idx) => (
              <Chip
                size="small"
                clickable
                onClick={() => removeId(idx)}
                closeButton
              >
                {i}
              </Chip>
            ))}
          />
        )}
      </div>
    </Card>
  )
}
