import React, { useEffect } from 'react'
import { Button } from '@pluralsh/design-system'

import { useCreatePullRequestMutation } from '../../../generated/graphql'

export function ClusterUpgradePR({ prs, setError }) {
  const pr = prs[0]
  const [mutation, { loading, error }] = useCreatePullRequestMutation({
    variables: {
      id: pr.id,
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

  useEffect(() => {
    setError(error)
  }, [error, setError])

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
