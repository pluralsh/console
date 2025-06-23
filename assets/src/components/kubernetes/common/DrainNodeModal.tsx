import { Switch } from '@pluralsh/design-system'
import { Dispatch, SetStateAction, use, useState } from 'react'
import { useTheme } from 'styled-components'
import {
  DrainNodeMutationVariables,
  useDrainNodeMutation,
} from '../../../generated/graphql-kubernetes.ts'
import { KubernetesClient } from '../../../helpers/kubernetes.client.ts'
import { Confirm } from '../../utils/Confirm.tsx'
import { ClusterContext } from '../Cluster.tsx'

export function DrainNodeModal({
  name,
  open,
  setOpen,
  clusterId: providedClusterId,
}: {
  name: string
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
  clusterId?: string
}) {
  const theme = useTheme()
  const { cluster } = use(ClusterContext) ?? {}
  const [ignoreAllDaemonSets, setIgnoreAllDaemonSets] = useState(true)
  const [mutation, { loading, error }] = useDrainNodeMutation({
    client: KubernetesClient(providedClusterId ?? cluster?.id ?? ''),
    variables: {
      name,
      input: { ignoreAllDaemonSets },
    } as DrainNodeMutationVariables,
    onCompleted: () => setOpen(false),
  })

  return (
    <>
      <Confirm
        close={() => setOpen(false)}
        destructive
        label="Drain node"
        confirmationEnabled
        confirmationText="drain node"
        loading={loading}
        error={error}
        open={open}
        submit={() => mutation()}
        title="Drain node"
        text={`Are you sure you want to drain ${name} node? Node will be cordoned first. Please note that it may take a while to complete.`}
        extraContent={
          <Switch
            checked={ignoreAllDaemonSets}
            onChange={setIgnoreAllDaemonSets}
            css={{ paddingTop: theme.spacing.medium }}
          >
            Ignore all daemon sets
          </Switch>
        }
      />
    </>
  )
}
