import { Dispatch, SetStateAction, useEffect } from 'react'
import { Button } from '@pluralsh/design-system'

import {
  ClusterUpgradeFragment,
  useCreatePullRequestMutation,
} from '../../../generated/graphql'
import { ApolloError } from '@apollo/client'

export function ClusterUpgradePR({
  prs,
  setError,
}: {
  prs: Exclude<ClusterUpgradeFragment['prAutomations'], null | undefined>
  setError: Nullable<Dispatch<SetStateAction<Nullable<ApolloError>>>>
}) {
  const pr = prs[0]

  const [mutation, { loading, error }] = useCreatePullRequestMutation({
    variables: {
      id: pr?.id ?? '',
      branch: 'mjg/upgrade',
      context: JSON.stringify({ version: '1.28' }),
    },
    onCompleted: (data) => {
      const url = data.createPullRequest?.url
      if (url) {
        window.open(url, '_blank')?.focus()
      }
    },
  })

  useEffect(() => setError?.(error), [error, setError])

  return (
    <Button
      type="button"
      secondary
      onClick={mutation}
      loading={loading}
    >
      Upgrade Now
    </Button>
  )
}
