import { Button, CheckIcon } from '@pluralsh/design-system'
import { APPROVE_BUILD } from 'components/graphql/builds'
import { BuildStatus } from 'components/types'
import { useMutation } from '@apollo/client'

export default function BuildApproval({ build }) {
  const [mutation, { loading }] = useMutation(APPROVE_BUILD, { variables: { id: build.id } })

  if (!!build?.approver || build.status !== BuildStatus.PENDING) return null

  return (
    <Button
      startIcon={<CheckIcon />}
      fontWeight={600}
      loading={loading}
      onClick={() => mutation()}
      width={200}
    >
      Approve
    </Button>
  )
}
