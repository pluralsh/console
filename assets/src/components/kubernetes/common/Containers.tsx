import { ReactElement } from 'react'

import { Chip, Code } from '@pluralsh/design-system'

import {
  Pod_Container as ContainerT,
  Maybe,
} from '../../../generated/graphql-kubernetes'

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
    <ResourceInfoCard title={container.name}>
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
            'None'
          )}
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Args">
          {container.args ? <Code>{container.args.join('\n')}</Code> : 'None'}
        </ResourceInfoCardEntry>
        {/* <Entry heading="Volume mounts">{container.volumeMounts}</Entry> */}
      </ResourceInfoCardSection>
      <ResourceInfoCardSection heading="Status">
        <ResourceInfoCardEntry heading="Started">
          {container.status?.started}
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Ready">
          {container.status?.ready}
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Restarts">
          {container.status?.restartCount}
        </ResourceInfoCardEntry>
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

      {/* <SidecarItem heading="Liveness">{container.livenessProbe}</SidecarItem> */}
      {/* <SidecarItem heading="Readines">{container.readinessProbe}</SidecarItem> */}
      {/* <SidecarItem heading="Startup">{container.startupProbe}</SidecarItem> */}
      {/* <SidecarItem heading="Resources">{container.resources}</SidecarItem> */}
    </ResourceInfoCard>
  )
}
