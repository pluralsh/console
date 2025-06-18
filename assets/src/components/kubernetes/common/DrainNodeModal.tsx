import { Switch } from '@pluralsh/design-system'
import { Confirm } from '../../utils/Confirm.tsx'
import { useTheme } from 'styled-components'
import { useCluster } from '../Cluster.tsx'
import { Dispatch, SetStateAction, useState } from 'react'
import {
  DrainNodeMutationVariables,
  useDrainNodeMutation,
} from '../../../generated/graphql-kubernetes.ts'
import { KubernetesClient } from '../../../helpers/kubernetes.client.ts'

export function DrainNodeModal({
  name,
  open,
  setOpen,
}: {
  name: string
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
}) {
  const theme = useTheme()
  const cluster = useCluster()
  const [ignoreAllDaemonSets, setIgnoreAllDaemonSets] = useState(true)
  const [mutation, { loading, error }] = useDrainNodeMutation({
    client: KubernetesClient(cluster?.id ?? ''),
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
