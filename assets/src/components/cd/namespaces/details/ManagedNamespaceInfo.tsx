import {
  AppIcon,
  Card,
  Chip,
  ChipList,
  Code,
  GlobeIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { deepOmitKey } from '../../../../utils/deepOmitKey'
import { getDistroProviderIconUrl } from '../../../utils/ClusterDistro'

import PropCard from '../../../utils/PropCard.tsx'
import { useSetPageScrollable } from '../../ContinuousDeployment'

import { getBreadcrumbs, ManagedNamespaceContextT } from './ManagedNamespace'

export default function ManagedNamespaceInfo() {
  const theme = useTheme()
  const { namespaceId, namespace } =
    useOutletContext<ManagedNamespaceContextT>()

  useSetBreadcrumbs(
    useMemo(
      () => [...getBreadcrumbs(namespaceId, namespace), { label: 'info' }],
      [namespaceId, namespace]
    )
  )

  useSetPageScrollable(true)

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.large,
        height: '100%',
      }}
    >
      <div
        css={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridAutoRows: 'min-content',
          gridGap: theme.spacing.small,
        }}
      >
        <PropCard title="Namespace">{namespace?.name}</PropCard>
        <PropCard
          title="Description"
          css={{ gridColumn: 'span 2' }}
        >
          {namespace?.description ?? 'No description found'}
        </PropCard>
        <PropCard title="Distribution">
          <div
            css={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.small,
            }}
          >
            <AppIcon
              spacing="padding"
              size="xxsmall"
              icon={
                namespace?.target?.distro ? undefined : <GlobeIcon size={16} />
              }
              url={
                namespace?.target?.distro
                  ? getDistroProviderIconUrl({
                      distro: namespace?.target?.distro,
                      mode: theme.mode,
                    })
                  : undefined
              }
            />
            {namespace?.target?.distro || 'All distributions'}
          </div>
        </PropCard>

        <PropCard
          title="Tags"
          css={{ gridColumn: 'span 2' }}
        >
          <ChipList
            limit={8}
            values={Object.entries(namespace?.target?.tags ?? {})}
            transformValue={(tag) => tag.join(': ')}
            emptyState={<div>No tags found</div>}
          />
        </PropCard>
        <PropCard
          title="Pull secrets"
          css={{ gridColumn: 'span 2' }}
        >
          <ChipList
            limit={8}
            values={namespace?.pullSecrets ?? []}
            emptyState={<div>No pull secrets found</div>}
          />
        </PropCard>
        {namespace?.cascade && (
          <PropCard title="Cascade">
            {namespace.cascade.delete && <Chip>Delete</Chip>}
            {namespace.cascade.detach && <Chip>Detach</Chip>}
          </PropCard>
        )}
        {namespace?.project && (
          <PropCard title="Project">{namespace.project.name}</PropCard>
        )}
        <PropCard
          title="Labels"
          css={{ gridColumn: 'span 2' }}
        >
          <ChipList
            limit={8}
            values={Object.entries(namespace?.labels ?? {})}
            transformValue={(label) => label.join(': ')}
            emptyState={<div>No tags found</div>}
          />
        </PropCard>
        <PropCard
          title="Annotations"
          css={{ gridColumn: 'span 2' }}
        >
          <ChipList
            limit={8}
            values={Object.entries(namespace?.annotations ?? {})}
            transformValue={(label) => label.join(': ')}
            emptyState={<div>No tags found</div>}
          />
        </PropCard>
      </div>
      {namespace?.service ? (
        <Code
          language="JSON"
          title="Template"
          css={{ height: '100%' }}
        >
          {JSON.stringify(
            deepOmitKey(namespace?.service, '__typename' as const),
            null,
            2
          )}
        </Code>
      ) : (
        <Card
          css={{
            alignItems: 'center',
            display: 'flex',
            color: theme.colors['text-xlight'],
            justifyContent: 'center',
            padding: theme.spacing.medium,
            height: '100%',
          }}
        >
          <div>This global service is not based on service template.</div>
        </Card>
      )}
    </div>
  )
}
