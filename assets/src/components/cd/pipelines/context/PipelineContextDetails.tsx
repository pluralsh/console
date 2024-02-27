import { Card, LoopingLogo, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useTheme } from 'styled-components'
import { useParams } from 'react-router-dom'
import { usePipelineContextQuery } from 'generated/graphql'
import { GqlError } from 'components/utils/Alert'

import { PIPELINES_ABS_PATH } from 'routes/cdRoutesConsts'

import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'

import { Subtitle1H1 } from 'components/utils/typography/Text'

import { RawJson } from 'components/component/ComponentRaw'

import { PropWideBold } from 'components/component/info/common'

import { PipelinePullRequestsTable } from '../PipelinePullRequests'
import { getPipelineBreadcrumbs } from '../PipelineDetails'

export function PipelineContextDetails() {
  const theme = useTheme()
  const pipelineId = useParams().pipelineId!
  const contextId = useParams().contextId!
  const { data, error } = usePipelineContextQuery({
    variables: { id: contextId || '' },
    skip: !contextId,
  })
  const context = data?.pipelineContext
  const pipelineName = context?.pipeline?.name

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getPipelineBreadcrumbs({
          pipelineName,
          pipelineId,
        }),
        ...(!pipelineName
          ? []
          : [
              { label: 'context' },
              {
                label: contextId,
                url: `${PIPELINES_ABS_PATH}/${pipelineId}/context/${contextId}`,
              },
            ]),
      ],
      [contextId, pipelineId, pipelineName]
    )
  )
  const pullRequestEdges =
    context?.pullRequests?.map((pr) => ({ node: pr })) || []

  if (!context && error) return <GqlError error={error} />
  if (!context) return <LoopingLogo />

  return (
    <ResponsivePageFullWidth
      scrollable
      heading={`Pipeline context — ${context?.pipeline?.name} – ${context?.id}`}
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.large,
        }}
      >
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.medium,
          }}
        >
          <Subtitle1H1 as="h2">Pull requests</Subtitle1H1>
          <PipelinePullRequestsTable pullRequestEdges={pullRequestEdges} />
        </div>

        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.medium,
          }}
        >
          <Subtitle1H1 as="h2">Metadata</Subtitle1H1>
          <RawJson raw={context.context} />
          <Card
            css={{
              display: 'flex',
              padding: theme.spacing.xlarge,
              gap: theme.spacing.xsmall,
              flexDirection: 'column',
            }}
          >
            <div>
              {context?.id && (
                <PropWideBold
                  title="ID"
                  fontWeight={600}
                >
                  {context.id}
                </PropWideBold>
              )}
              {context?.insertedAt && (
                <PropWideBold
                  title="Date created"
                  fontWeight={600}
                >
                  {context.insertedAt}
                </PropWideBold>
              )}
              {context?.updatedAt && (
                <PropWideBold
                  title="Date updated"
                  fontWeight={600}
                >
                  {context.updatedAt}
                </PropWideBold>
              )}
            </div>
          </Card>
        </div>
      </div>
    </ResponsivePageFullWidth>
  )
}
