import { ApolloError } from '@apollo/client'

import React, { useCallback, useState } from 'react'
import isEmpty from 'lodash/isEmpty'
import { Button, Tooltip, WrapWithIf } from '@pluralsh/design-system'

import { isUpgrading, toProviderSupportedVersion } from '../../../utils/semver'
import {
  ApiDeprecation,
  ClustersRowFragment,
  useUpdateClusterMutation,
} from '../../../generated/graphql'
import { Confirm } from '../../utils/Confirm'

export function ClustersUpgradeNow({
  cluster,
  targetVersion,
  apiDeprecations,
  refetch,
  setError,
}: {
  cluster?: ClustersRowFragment | null
  targetVersion: Nullable<string>
  apiDeprecations: ApiDeprecation[]
  refetch: Nullable<() => void>
  setError: Nullable<(error: Nullable<ApolloError>) => void>
}) {
  const [updateCluster, { loading, error }] = useUpdateClusterMutation({
    variables: {
      id: cluster?.id ?? '',
      attributes: {
        version: toProviderSupportedVersion(
          targetVersion,
          cluster?.provider?.cloud
        ),
      },
    },
    onCompleted: () => {
      refetch?.()
      setError?.(undefined)
      setConfirm(false)
    },
    onError: (e: ApolloError) => setError?.(e),
  })
  const [confirm, setConfirm] = useState(false)
  const hasDeprecations = !isEmpty(apiDeprecations)
  const onClick = useCallback(
    () => (!hasDeprecations ? updateCluster() : setConfirm(true)),
    [hasDeprecations, updateCluster]
  )
  const upgrading =
    !cluster?.self && isUpgrading(cluster?.version, cluster?.currentVersion)

  const tooltip = upgrading
    ? 'Cluster is already upgrading'
    : cluster?.deletedAt
    ? 'Cluster is being deleted'
    : null

  return (
    <>
      <WrapWithIf
        condition={upgrading || !!cluster?.deletedAt}
        wrapper={<Tooltip label={tooltip} />}
      >
        <div>
          <Button
            small
            disabled={!targetVersion || upgrading || !!cluster?.deletedAt}
            destructive={hasDeprecations}
            floating={!hasDeprecations}
            width="fit-content"
            loading={!hasDeprecations && loading}
            onClick={onClick}
          >
            Upgrade now
          </Button>
        </div>
      </WrapWithIf>
      <Confirm
        open={confirm}
        title="Confirm upgrade"
        text="This could be a destructive action. Before updating your Kubernetes version check and fix all deprecated resources."
        close={() => setConfirm(false)}
        submit={updateCluster}
        loading={loading}
        error={error}
        destructive
      />
    </>
  )
}
