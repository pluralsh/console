import {
  Card,
  ChipList,
  Code,
  CodeEditor,
  EmptyState,
  Prop,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'

import React, { useMemo } from 'react'

import { useOutletContext, useParams } from 'react-router-dom'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import { isEmpty } from 'lodash'

import { useTheme } from 'styled-components'

import { StackOutletContextT, getBreadcrumbs } from '../StackDetails'

export default function StackJob() {
  const theme = useTheme()
  const { stackId = '' } = useParams()
  const { stack } = useOutletContext() as StackOutletContextT

  useSetBreadcrumbs(
    useMemo(
      () => [...getBreadcrumbs(stackId), { label: 'repository' }],
      [stackId]
    )
  )

  if (!stack) {
    return <LoadingIndicator />
  }

  if (!stack.jobSpec) {
    return <EmptyState message="No job spec found." />
  }

  return (
    <Card
      padding="large"
      css={{
        display: 'flex',
        flexWrap: 'wrap',
      }}
    >
      <Prop title="Namespace">{stack.jobSpec.namespace}</Prop>

      {stack.jobSpec.serviceAccount && (
        <Prop title="Service account">{stack.jobSpec.serviceAccount}</Prop>
      )}

      {stack.jobSpec.annotations && (
        <Prop title="Annotations">
          <ChipList
            size="small"
            limit={8}
            values={Object.entries(stack.jobSpec.annotations) || []}
            transformValue={(annotation) => annotation.join(': ')}
          />
        </Prop>
      )}

      {stack.jobSpec.labels && (
        <Prop title="Labels">
          <ChipList
            size="small"
            limit={8}
            values={Object.entries(stack.jobSpec.labels) || []}
            transformValue={(label) => label.join(': ')}
          />
        </Prop>
      )}

      <div css={{ width: '100%' }}>
        {!isEmpty(stack.jobSpec.containers) && (
          <Prop
            title="Containers"
            css={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.large,
            }}
          >
            {stack?.jobSpec?.containers?.map((container) => (
              <Card>
                <Prop title="Image">{container?.image}</Prop>
                <Prop title="Args">
                  {container?.args ? (
                    <Code>{container?.args.join('\n')}</Code>
                  ) : (
                    '-'
                  )}
                </Prop>
                <Prop title="Env">
                  <ChipList
                    size="small"
                    limit={8}
                    values={container?.env || []}
                    transformValue={(e) => `${e?.name}: ${e?.value}`}
                  />
                </Prop>
                <Prop title="Env from">
                  <ChipList
                    size="small"
                    limit={8}
                    values={container?.envFrom || []}
                    transformValue={(e) =>
                      `Config map: ${e?.configMap};  Secret: ${e?.secret}`
                    }
                  />
                </Prop>
              </Card>
            ))}
          </Prop>
        )}
      </div>

      <div css={{ width: '100%' }}>
        {stack.jobSpec.raw && (
          <Prop title="Raw">
            <CodeEditor
              height={300}
              width="100%"
              value={stack.jobSpec.raw}
            />
          </Prop>
        )}
      </div>
    </Card>
  )
}
