import { Switch } from '@pluralsh/design-system'
import { Dispatch, SetStateAction, use, useState } from 'react'
import { useTheme } from 'styled-components'
import { useMutation } from '@tanstack/react-query'
import { AxiosInstance } from '../../../helpers/axios.ts'
import { drainNodeMutation } from '../../../generated/kubernetes/@tanstack/react-query.gen.ts'
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

  const mutation = useMutation({
    ...drainNodeMutation(),
    onSuccess: () => setOpen(false),
  })

  return (
    <>
      <Confirm
        close={() => setOpen(false)}
        destructive
        label="Drain node"
        confirmationEnabled
        confirmationText="drain node"
        loading={mutation.isPending}
        error={mutation.error}
        open={open}
        submit={() =>
          mutation.mutate({
            client: AxiosInstance(providedClusterId ?? cluster?.id ?? ''),
            path: { name },
            body: { ignoreAllDaemonSets },
          })
        }
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
