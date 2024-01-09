import { useOutletContext } from 'react-router-dom'
import { useMemo } from 'react'
import { LabelsAnnotations } from 'components/cluster/LabelsAnnotations'
import { MetadataGrid, MetadataItem } from 'components/utils/Metadata'
import { useTheme } from 'styled-components'

import { ComponentStatusChip } from '../../apps/app/components/misc'

import { InfoSectionH2 } from './common'

export const componentsWithLogs: string[] = ['deployment', 'statefulset']

export default function MetadataOutlet() {
  const { component, data } = useOutletContext<any>()

  // To avoid mapping between component types and fields of data returned by API
  // we are picking first available value from API object for now.
  const value: any = useMemo(
    () =>
      data ? Object.values(data).find((value) => value !== undefined) : null,
    [data]
  )

  const metadata: Record<string, any> | null | undefined = value?.metadata

  return (
    <MetadataBase
      component={component}
      metadata={metadata}
    />
  )
}

export function MetadataBase({
  component,
  metadata,
}: {
  component: Nullable<Record<string, any>>
  metadata: Nullable<Record<string, any>>
}) {
  const theme = useTheme()

  return (
    <div
      css={{
        flexDirection: 'column',
        flexGrow: 1,
      }}
    >
      <InfoSectionH2 css={{ marginBottom: theme.spacing.medium }}>
        Metadata
      </InfoSectionH2>
      <MetadataGrid>
        {(metadata?.name || component?.name) && (
          <MetadataItem heading="Name">
            {metadata?.name || component?.name}
          </MetadataItem>
        )}
        {(metadata?.namespace || component?.namespace) && (
          <MetadataItem heading="Namespace">
            {metadata?.namespace || component?.namespace}
          </MetadataItem>
        )}
        {component?.kind && (
          <MetadataItem heading="Kind">
            <>
              {component?.group || 'v1'}/{component?.kind}
            </>
          </MetadataItem>
        )}
        {component?.status && typeof component?.status === 'string' && (
          <MetadataItem heading="Status">
            <ComponentStatusChip status={component?.status} />
          </MetadataItem>
        )}
      </MetadataGrid>
      {metadata && (
        <LabelsAnnotations
          metadata={metadata as any}
          marginTop="large"
        />
      )}
    </div>
  )
}
