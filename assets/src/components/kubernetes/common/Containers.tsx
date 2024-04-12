import { ReactElement } from 'react'
import { Chip, ChipList, CloseIcon, Code } from '@pluralsh/design-system'

import {
  Pod_Container as ContainerT,
  Maybe,
} from '../../../generated/graphql-kubernetes'
import { ContainerStatus } from '../../cluster/ContainerStatuses'
import { toReadiness } from '../workloads/utils'

import ResourceInfoCard, {
  ResourceInfoCardEntry,
  ResourceInfoCardSection,
} from './ResourceInfoCard'

interface ContainersProps {
  containers: Array<Maybe<ContainerT>>
}

export default function Containers({
  containers,
}: ContainersProps): ReactElement {
  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {containers &&
        containers.map((c) => (
          <Container
            key={c?.name}
            container={c!}
          />
        ))}
    </div>
  )
}

interface ContainerProps {
  container: ContainerT
}

function Container({ container }: ContainerProps): ReactElement {
  return (
    <ResourceInfoCard
      title={
        <div
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ContainerStatus
            status={{
              name: '',
              readiness: toReadiness(container.status),
            }}
          />
          <span>{container.name}</span>
        </div>
      }
    >
      <ResourceInfoCardSection>
        <ResourceInfoCardEntry heading="Image">
          <Chip size="small">{container.image}</Chip>
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Container ID">
          {container.status?.containerID}
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Env">
          {container.env && container.env.map((e) => <div>{e?.name}</div>)}
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Commands">
          {container.commands ? (
            <Code>{container.commands.join('\n')}</Code>
          ) : (
            '-'
          )}
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Args">
          {container.args ? <Code>{container.args.join('\n')}</Code> : '-'}
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Restarts">
          {container.status?.restartCount}
        </ResourceInfoCardEntry>
        {/* <Entry heading="Volume mounts">{container.volumeMounts}</Entry> */}
      </ResourceInfoCardSection>

      <ResourceInfoCardSection heading="Security context">
        <ResourceInfoCardEntry heading="Privileged">
          {container.securityContext?.privileged}
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Allow privilege escalation">
          {container.securityContext?.allowPrivilegeEscalation}
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Run as user">
          {container.securityContext?.runAsUser}
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Run as group">
          {container.securityContext?.runAsGroup}
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Run as non-root">
          {container.securityContext?.runAsNonRoot}
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Read-only root filesystem">
          {container.securityContext?.readOnlyRootFilesystem}
        </ResourceInfoCardEntry>

        {/* {container.securityContext?.capabilities} */}
        {/* {container.securityContext?.seLinuxOptions} */}
        {/* {container.securityContext?.windowsOptions} */}
        {/* {container.securityContext?.procMount} */}
        {/* {container.securityContext?.seccompProfile} */}
      </ResourceInfoCardSection>

      <ResourceInfoCardSection heading="Resources">
        <ResourceInfoCardEntry heading="Claims">
          <ChipList
            size="small"
            values={Object.entries(
              container?.resources?.claims?.map((c) => c?.name) ?? []
            )}
            limit={3}
            emptyState={<CloseIcon />}
          />
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Requests">
          <ChipList
            size="small"
            values={Object.entries(container?.resources?.requests ?? [])}
            transformValue={(label) => label.join(': ')}
            limit={3}
            emptyState={<CloseIcon />}
          />
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Limits">
          <ChipList
            size="small"
            values={Object.entries(container?.resources?.limits ?? [])}
            transformValue={(label) => label.join(': ')}
            limit={3}
            emptyState={<CloseIcon />}
          />
        </ResourceInfoCardEntry>
        {/* {container.securityContext?.capabilities} */}
        {/* {container.securityContext?.seLinuxOptions} */}
        {/* {container.securityContext?.windowsOptions} */}
        {/* {container.securityContext?.procMount} */}
        {/* {container.securityContext?.seccompProfile} */}
      </ResourceInfoCardSection>

      {/* <SidecarItem heading="Liveness">{container.livenessProbe}</SidecarItem> */}
      {/* <SidecarItem heading="Readines">{container.readinessProbe}</SidecarItem> */}
      {/* <SidecarItem heading="Startup">{container.startupProbe}</SidecarItem> */}
      {/* <SidecarItem heading="Resources">{container.resources}</SidecarItem> */}
    </ResourceInfoCard>
  )
}
