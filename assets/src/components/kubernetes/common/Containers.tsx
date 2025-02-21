import { Chip, ChipList, CloseIcon, Code } from '@pluralsh/design-system'
import { dump } from 'js-yaml'

import {
  Pod_Container as ContainerT,
  Maybe,
  V1_Probe as ProbeT,
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

export default function Containers({ containers }: ContainersProps) {
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

function Container({ container }: ContainerProps) {
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
              readiness: toReadiness(container?.state),
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
            // @ts-ignore
            <Code
              css={{
                pre: {
                  whiteSpace: 'break-spaces',
                  wordBreak: 'break-word',
                },
              }}
            >
              {container.commands.join('\n')}
            </Code>
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
      </ResourceInfoCardSection>
      <ResourceInfoCardSection heading="Security">
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
        <ResourceInfoCardEntry heading="Proc mount">
          {container.securityContext?.procMount}
        </ResourceInfoCardEntry>
      </ResourceInfoCardSection>
      <ResourceInfoCardSection heading="Seccomp profile">
        <ResourceInfoCardEntry heading="Type">
          {container.securityContext?.seccompProfile?.type}
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Profile">
          {container.securityContext?.seccompProfile?.localhostProfile}
        </ResourceInfoCardEntry>
      </ResourceInfoCardSection>
      <ResourceInfoCardSection heading="Windows Options">
        <ResourceInfoCardEntry heading="Run as user">
          {container.securityContext?.windowsOptions?.runAsUserName}
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Host process">
          {container.securityContext?.windowsOptions?.hostProcess}
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="GMSA credentials spec name">
          {container.securityContext?.windowsOptions?.gmsaCredentialSpecName}
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="GMSA credential spec">
          {container.securityContext?.windowsOptions?.gmsaCredentialSpec}
        </ResourceInfoCardEntry>
      </ResourceInfoCardSection>
      <ResourceInfoCardSection heading="SELinux options">
        <ResourceInfoCardEntry heading="Role">
          {container.securityContext?.seLinuxOptions?.role && (
            <Chip size="small">
              {container.securityContext?.seLinuxOptions?.role}
            </Chip>
          )}
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Level">
          {container.securityContext?.seLinuxOptions?.level && (
            <Chip size="small">
              {container.securityContext?.seLinuxOptions?.level}
            </Chip>
          )}
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="User">
          {container.securityContext?.seLinuxOptions?.user && (
            <Chip size="small">
              {container.securityContext?.seLinuxOptions?.user}
            </Chip>
          )}
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Type">
          {container.securityContext?.seLinuxOptions?.type && (
            <Chip size="small">
              {container.securityContext?.seLinuxOptions?.type}
            </Chip>
          )}
        </ResourceInfoCardEntry>
      </ResourceInfoCardSection>
      <ResourceInfoCardSection heading="Capabilities">
        <ResourceInfoCardEntry heading="Add">
          {container.securityContext?.capabilities?.add && (
            <ChipList
              values={container.securityContext?.capabilities?.add ?? []}
              limit={3}
              emptyState={<>-</>}
            />
          )}
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Drop">
          {container.securityContext?.capabilities?.drop && (
            <ChipList
              values={container.securityContext?.capabilities?.drop ?? []}
              limit={3}
              emptyState={<>-</>}
            />
          )}
        </ResourceInfoCardEntry>
      </ResourceInfoCardSection>
      <ResourceInfoCardSection heading="Resources">
        <ResourceInfoCardEntry heading="Claims">
          {container?.resources?.claims && (
            <ChipList
              size="small"
              values={Object.entries(
                container?.resources?.claims?.map((c) => c?.name)
              )}
              limit={3}
              emptyState={<CloseIcon />}
            />
          )}
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Requests">
          {container?.resources?.requests && (
            <ChipList
              size="small"
              values={Object.entries(container?.resources?.requests ?? [])}
              transformValue={(label) => label.join(': ')}
              limit={3}
              emptyState={<CloseIcon />}
            />
          )}
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Limits">
          {container?.resources?.limits && (
            <ChipList
              size="small"
              values={Object.entries(container?.resources?.limits ?? [])}
              transformValue={(label) => label.join(': ')}
              limit={3}
              emptyState={<CloseIcon />}
            />
          )}
        </ResourceInfoCardEntry>
      </ResourceInfoCardSection>
      <Probe
        heading="Liveness probe"
        probe={container?.livenessProbe}
      />
      <Probe
        heading="Readiness probe"
        probe={container?.readinessProbe}
      />
      <Probe
        heading="Startup probe"
        probe={container?.startupProbe}
      />
    </ResourceInfoCard>
  )
}

function Probe({ heading, probe }: { heading: string; probe: ProbeT }) {
  return (
    <ResourceInfoCardSection heading={heading}>
      <ResourceInfoCardEntry heading="Failure threshold">
        {probe?.failureThreshold}
      </ResourceInfoCardEntry>
      <ResourceInfoCardEntry heading="Success threshold">
        {probe?.successThreshold}
      </ResourceInfoCardEntry>
      <ResourceInfoCardEntry heading="Termination grace period seconds">
        {probe?.terminationGracePeriodSeconds}
      </ResourceInfoCardEntry>
      <ResourceInfoCardEntry heading="Timeout seconds">
        {probe?.timeoutSeconds}
      </ResourceInfoCardEntry>
      <ResourceInfoCardEntry heading="Period seconds">
        {probe?.periodSeconds}
      </ResourceInfoCardEntry>
      <ResourceInfoCardEntry heading="Initial delay seconds">
        {probe?.initialDelaySeconds}
      </ResourceInfoCardEntry>
      <ResourceInfoCardEntry heading="Exec">
        {probe?.exec?.command}
      </ResourceInfoCardEntry>
      <ResourceInfoCardEntry heading="Grpc">
        {probe?.grpc?.service &&
          probe?.grpc?.port &&
          `${probe?.grpc?.service}:${probe?.grpc?.port}`}
      </ResourceInfoCardEntry>
      <ResourceInfoCardEntry heading="HTTP Get">
        {probe?.httpGet && <Code>{dump(probe?.httpGet)}</Code>}
      </ResourceInfoCardEntry>
      <ResourceInfoCardEntry heading="TCP socket">
        {probe?.tcpSocket?.host &&
          probe?.tcpSocket?.port &&
          `${probe?.tcpSocket?.host}:${probe?.tcpSocket?.port}`}
      </ResourceInfoCardEntry>
    </ResourceInfoCardSection>
  )
}
