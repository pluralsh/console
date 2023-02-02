import { Card, EmptyState, SidecarProps } from '@pluralsh/design-system'
import {
  A,
  Div,
  Flex,
  H2,
} from 'honorable'
import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { containerStatusToReadiness } from 'utils/status'

import { makeGrid } from 'utils/makeGrid'

import { ContainerStatusChip } from '../TableElements'

import { useContainer } from './Container'

const MetadataGrid = styled(Card)(({ theme }) => ({
  ...makeGrid({ maxCols: 4, minColWidth: 186, gap: theme.spacing.xlarge }),
  padding: theme.spacing.large,
}))

const MetadataItem = forwardRef<HTMLDivElement, SidecarProps>(({
  heading, headingProps, contentProps, children, ...props
}, ref) => (
  <Flex
    ref={ref}
    direction="column"
    gap="xsmall"
    {...props}
  >
    {heading && (
      <H2
        body1
        bold
        color="text-default"
        {...headingProps}
      >
        {heading}
      </H2>
    )}
    {children && (
      <Div
        body1
        color="text-xlight"
        overflowWrap="anywhere"
        {...contentProps}
      >
        {children}
      </Div>
    )}
  </Flex>
))

export default function ContainerMetadata() {
  const containerContext = useContainer()

  if (!containerContext) {
    return <EmptyState message="This container has no metadata" />
  }
  const { container, containerStatus, pod } = containerContext

  return (
    <MetadataGrid>
      <MetadataItem heading="Container name">{container?.name}</MetadataItem>
      <MetadataItem heading="Parent pod">
        <A
          inline
          as={Link}
          to={`/pods/${pod?.metadata.namespace}/${pod?.metadata.name}`}
        >
          {pod?.metadata.name}
        </A>
      </MetadataItem>
      {container?.ports && container?.ports?.length > 0 && (
        <MetadataItem heading="Ports">
          {container.ports.map(port => (
            <div>
              {port?.protocol ? `${port.protocol} ` : ''}
              {port?.containerPort}
            </div>
          ))}
        </MetadataItem>
      )}
      {pod?.status?.podIp && (
        <MetadataItem heading="IP">{pod.status.podIp}</MetadataItem>
      )}
      <MetadataItem heading="Image">{container?.image}</MetadataItem>
      <MetadataItem heading="Service account">
        {pod.spec.serviceAccountName}
      </MetadataItem>
      <MetadataItem heading="Status">
        <ContainerStatusChip
          readiness={containerStatusToReadiness(containerStatus)}
        />
      </MetadataItem>
      {containerStatus?.state?.running?.startedAt && (
        <MetadataItem heading="Started at">
          {containerStatus?.state?.running?.startedAt}
        </MetadataItem>
      )}
    </MetadataGrid>
  )
}
