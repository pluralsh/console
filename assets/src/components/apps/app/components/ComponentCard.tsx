import { Card, IconFrame, Tooltip } from '@pluralsh/design-system'
import { Link, useParams } from 'react-router-dom'
import styled from 'styled-components'

import { TRUNCATE } from 'components/utils/truncate'
import { AiInsightSummaryFragment, ComponentState } from 'generated/graphql'

import { ComponentIcon, ComponentStateChip, ComponentStatusChip } from './misc'
import { AiInsightSummaryIcon } from 'components/utils/AiInsights'
import { getServiceComponentPath } from 'routes/cdRoutesConsts'

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
    flexDirection: 'column',
    alignItems: 'baseline',
    columnGap: theme.spacing.small,
    rowGap: theme.spacing.xxxsmall,
    flexShrink: 1,
    flexGrow: 1,
    overflow: 'hidden',
    '.name': {
      ...theme.partials.text.body2Bold,
      maxWidth: '100%',
      ...TRUNCATE,
      flexShrink: 1,
    },
    '.kind': {
      ...theme.partials.text.caption,
      maxWidth: '100%',
      ...TRUNCATE,
      color: theme.colors['text-xlight'],
      marginRight: theme.spacing.xsmall,
      flexShrink: 1,
      flexGrow: 1,
    },
  },
  '.status': {
    flexShrink: 0,
  },
}))

export type Component = {
  id: string
  name: string
  group?: Nullable<string>
  kind: string
  status?: Nullable<string>
  state?: Nullable<ComponentState>
  synced?: Nullable<boolean>
  insight?: Nullable<AiInsightSummaryFragment>
}

export default function ComponentCard<C extends Component>({
  component,
  url,
}: {
  component: C
  url?: string
}) {
  const { clusterId, serviceId } = useParams()
  const { name, group, kind, status, state, synced } = component
  const kindString = `${group || 'v1'}/${kind.toLowerCase()}`
  const componentState =
    state === null && synced ? ComponentState.Running : state

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
        <p className="name">
          <Tooltip
            label={name}
            placement="bottom"
          >
            <span>{name}</span>
          </Tooltip>
        </p>
        <p className="kind">
          <Tooltip label={kindString}>
            <span>{kindString}</span>
          </Tooltip>
        </p>
      </div>
      <AiInsightSummaryIcon
        navPath={`${getServiceComponentPath({
          clusterId,
          serviceId,
          componentId: component.id,
        })}/insights`}
        insight={component.insight}
      />
      {state || state === null ? (
        <ComponentStateChip
          state={componentState}
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
