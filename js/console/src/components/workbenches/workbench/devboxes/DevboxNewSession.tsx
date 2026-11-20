import { ListBoxItem } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { CaptionP } from 'components/utils/typography/Text'
import {
  DevboxAgentType,
  DevboxInstanceFragment,
  DevboxProbeStatus,
} from 'generated/graphql'
import { useState } from 'react'
import styled from 'styled-components'
import {
  autonomyChoices,
  defaultAutonomy,
  isAutonomyOption,
} from './devboxAutonomy'
import { DevboxModelLabel, DevboxModelProviderIcon } from './DevboxChips'
import { DevboxComposer } from './DevboxComposer'
import { isInstanceLive, isInstanceTerminal } from './devboxIdle'
import { AutonomyPillSelect, PillSelect } from './DevboxPromptPills'
import {
  agentLabel,
  agentsOf,
  defaultAgentOf,
  defaultModelOf,
  findAgent,
  isProxyBilled,
  modelDisplayName,
  modelDisplayNameOf,
  modelsOf,
} from './devboxStartForm'
import { useDevboxWorkspaceApi } from './devboxWorkspaceApi'
import { useStartDevboxThread } from './useStartDevboxThread'

export function DevboxNewSession({
  instance,
  onStarted,
}: {
  instance: DevboxInstanceFragment
  onStarted: (threadId: string) => void
}) {
  const box = instance.devbox
  const agents = agentsOf(box)
  // the model and autonomy reset with the agent, as both are per agent
  const [picks, setPicks] = useState<{
    agent: Nullable<DevboxAgentType>
    model?: Nullable<string>
    autonomy?: Nullable<string>
  }>(() => ({ agent: instance.agent ?? defaultAgentOf(box)?.type ?? null }))
  const { agent } = picks
  const agentEntry = findAgent(box, agent)
  const models = modelsOf(agentEntry)
  const autonomyOption = (agentEntry?.configOptions ?? []).find(
    isAutonomyOption
  )
  const proxyBilled = isProxyBilled(instance, agent)
  const autonomyLevels = autonomyOption
    ? autonomyChoices(autonomyOption, box?.autonomy, proxyBilled)
    : []

  const model =
    picks.model !== undefined ? picks.model : defaultModelOf(agentEntry)
  const autonomy =
    picks.autonomy !== undefined
      ? picks.autonomy
      : autonomyOption
        ? defaultAutonomy(autonomyOption, box?.autonomy, proxyBilled)
        : null

  const { start, error } = useStartDevboxThread(instance)
  const live = isInstanceLive(instance.status)
  const terminal = isInstanceTerminal(instance.status)
  const { listFiles } = useDevboxWorkspaceApi(live ? instance.id : null)

  return (
    <CenterSC>
      {error && <GqlError error={error} />}
      {terminal ? (
        <CaptionP $color="text-xlight">
          This instance has ended. Start a new instance to keep working.
        </CaptionP>
      ) : (
        <DevboxComposer
          commands={agentEntry?.commands}
          listFiles={listFiles}
          autoFocus
          disabled={!live || !agent}
          placeholder={
            live
              ? `Tell ${agentLabel(agent)} what to do, / for commands or @ for files`
              : 'You can start a session once the instance is running'
          }
          onSubmit={(text, files) =>
            agent
              ? start({
                  agent,
                  model,
                  configOptions: autonomyOption
                    ? { [autonomyOption.configId]: autonomy }
                    : {},
                  text,
                  files,
                }).then(
                  (id) => {
                    if (id) onStarted(id)
                    return !!id
                  },
                  () => false
                )
              : false
          }
          toolbar={
            <>
              {!!agents.length && (
                <PillSelect
                  label="Agent"
                  selectedKey={agent}
                  onSelect={(key) =>
                    setPicks({ agent: key as DevboxAgentType })
                  }
                  showArrow={agents.length > 1}
                  disabled={agents.length < 2}
                  title={
                    agents.length < 2
                      ? `${agentLabel(agent)}, the only one this box offers`
                      : undefined
                  }
                  trigger={agentLabel(agent)}
                >
                  {agents.map((a) => (
                    <ListBoxItem
                      key={a.type}
                      label={agentLabel(a.type)}
                      disabled={unavailable(a.probeStatus)}
                      description={
                        unavailable(a.probeStatus)
                          ? "Not installed in the box's image"
                          : undefined
                      }
                    />
                  ))}
                </PillSelect>
              )}
              {!!models.length && (
                <PillSelect
                  label="Model"
                  selectedKey={model}
                  onSelect={(key) => setPicks({ ...picks, model: key })}
                  trigger={
                    <DevboxModelLabel
                      model={model}
                      label={modelDisplayNameOf(agentEntry, model) ?? 'Model'}
                    />
                  }
                >
                  {models.map((m) => (
                    <ListBoxItem
                      key={m.id}
                      label={modelDisplayName(m)}
                      description={m.description ?? undefined}
                      leftContent={<DevboxModelProviderIcon model={m.id} />}
                    />
                  ))}
                </PillSelect>
              )}
              {autonomyOption && !!autonomyLevels.length && (
                <AutonomyPillSelect
                  levels={autonomyLevels}
                  value={autonomy}
                  onSelect={(key) => setPicks({ ...picks, autonomy: key })}
                />
              )}
            </>
          }
        />
      )}
      {!live && !terminal && (
        <CaptionP $color="text-xlight">
          {instance.devbox?.name ?? 'The devbox'} is starting up…
        </CaptionP>
      )}
    </CenterSC>
  )
}

const unavailable = (status: Nullable<DevboxProbeStatus>) =>
  status === DevboxProbeStatus.Missing

const CenterSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: theme.spacing.medium,
  width: '100%',
  maxWidth: 760,
  height: '100%',
  margin: '0 auto',
}))
