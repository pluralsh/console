import { useOutletContext } from 'react-router-dom'
import { Flex } from 'honorable'

import { useMemo } from 'react'

import { LabelsAnnotations } from 'components/cluster/LabelsAnnotations'

import { MetadataGrid, MetadataItem } from 'components/utils/Metadata'

import { ComponentStatus } from '../misc'

export const componentsWithLogs: string[] = ['deployment', 'statefulset']

export default function ComponentInfo() {
  const { component, data } = useOutletContext<any>()

  // To avoid mapping between component types and fields of data returned by API
  // we are picking first available value from API object for now.
  const value: any = useMemo(() => (data ? Object.values(data).find(value => value !== undefined) : null),
    [data])

  const { metadata } = value

  return (
    <Flex
      direction="column"
      gap="large"
    >
      <MetadataGrid>
        <MetadataItem
          heading="Name"
          fontWeight={600}
        >
          {metadata.name}
        </MetadataItem>
        <MetadataItem
          heading="Namespace"
          fontWeight={600}
        >
          {metadata.namespace}
        </MetadataItem>
        <MetadataItem
          heading="Kind"
          fontWeight={600}
        >
          <>
            {component?.group || 'v1'}/{component?.kind}
          </>
        </MetadataItem>
        <MetadataItem
          heading="Status"
          fontWeight={600}
        >
          <ComponentStatus status={component?.status} />
        </MetadataItem>
      </MetadataGrid>
      <LabelsAnnotations metadata={value?.metadata} />
    </Flex>
  )
}
