import { Card, IconFrame, Tooltip } from '@pluralsh/design-system'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import { TRUNCATE } from 'components/utils/truncate'
import { ComponentState } from 'generated/graphql'

import { ComponentIcon, ComponentStateChip, ComponentStatusChip } from './misc'

const ComponentCardSC = styled(Card)(({ theme }) => ({
  '&&': {
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
    padding: `${theme.spacing.xxsmall}px ${theme.spacing.xsmall}px`,
    gap: theme.spacing.xsmall,
    textDecoration: 'none',
    '&:any-link': {
      textDecoration: 'none',
    },
  },
  '.content': {
    display: 'flex',
    alignItems: 'baseline',
    gap: theme.spacing.small,
    flexShrink: 1,
    flexGrow: 1,
    overflow: 'hidden',
    '.name': {
      ...theme.partials.text.body2Bold,
      ...TRUNCATE,
      flexShrink: 1,
    },
    '.kind': {
      ...theme.partials.text.caption,
      ...TRUNCATE,
      color: theme.colors['text-xlight'],
      marginRight: theme.spacing.xsmall,
      flexShrink: 0,
      flexGrow: 1,
    },
  },
  '.status': {
    flexShrink: 0,
  },
}))

export type Component = {
  name: string
  group?: string | null | undefined
  kind: string
  status?: string | null | undefined
  state?: ComponentState | null | undefined
}

export default function ComponentCard<C extends Component>({
  component,
  url,
}: {
  component: C
  url?: string
}) {
  const { name, group, kind, status, state } = component
  const kindString = `${group || 'v1'}/${kind.toLowerCase()}`

  return (
    <ComponentCardSC
      {...(url
        ? {
            clickable: true,
            forwardedAs: Link,
            to: url,
          }
        : {})}
    >
      <IconFrame
        icon={<ComponentIcon kind={kind} />}
        size="medium"
        textValue={name}
        type="tertiary"
        css={{ flexShrink: 0 }}
      />
      <div className="content">
        <Tooltip
          label={name}
          placement="bottom"
        >
          <p className="name">{name}</p>
        </Tooltip>
        <Tooltip label={kindString}>
          <p className="kind">{kindString}</p>
        </Tooltip>
      </div>
      {state || state === null ? (
        <ComponentStateChip
          state={state}
          className="status"
        />
      ) : (
        <ComponentStatusChip
          status={status}
          className="status"
        />
      )}
    </ComponentCardSC>
  )
}
