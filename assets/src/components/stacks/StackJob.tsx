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
import { useOutletContext } from 'react-router-dom'
import { isEmpty } from 'lodash'
import { useTheme } from 'styled-components'

import { StackOutletContextT, getBreadcrumbs } from './Stacks'

export default function StackJob() {
  const theme = useTheme()
  const { stack } = useOutletContext() as StackOutletContextT

  useSetBreadcrumbs(
    useMemo(
      () => [...getBreadcrumbs(stack.id ?? ''), { label: 'job' }],
      [stack.id]
    )
  )

  if (!stack.jobSpec) return <EmptyState message="No job spec found." />

  return (
    <Card
      padding="medium"
      css={{
        display: 'flex',
        flexWrap: 'wrap',
        overflowX: 'auto',
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
                {!isEmpty(container?.args) && (
                  <Prop title="Args">
                    <Code>{container?.args?.join('\n')}</Code>
                  </Prop>
                )}
                {!isEmpty(container?.env) && (
                  <Prop title="Env">
                    <ChipList
                      size="small"
                      limit={8}
                      values={container?.env || []}
                      transformValue={(e) => `${e?.name}: ${e?.value}`}
                    />
                  </Prop>
                )}
                {!isEmpty(container?.envFrom) && (
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
                )}
              </Card>
            ))}
          </Prop>
        )}
      </div>

      <div css={{ width: '100%' }}>
        {stack.jobSpec.raw && (
          <Prop title="Raw">
            <CodeEditor
              height={200}
              width="100%"
              value={stack.jobSpec.raw}
            />
          </Prop>
        )}
      </div>
    </Card>
  )
}