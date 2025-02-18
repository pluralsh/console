import { useTheme } from 'styled-components'
import { useCallback, useState } from 'react'
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

import { ChipList } from '../cd/services/CreateGlobalService'

import { Scope } from './AccessTokensCreateModal'

export function AccessTokensCreateScope({
  scope,
  setScope,
  remove,
  canRemove,
}: {
  scope: Scope
  setScope: any
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
      <FormField
        label="ID"
        hint="Add resource identifiers. Leave it blank or use * to match all resources."
        marginTop="small"
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
    </Card>
  )
}
