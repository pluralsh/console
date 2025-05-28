import styled, { useTheme } from 'styled-components'
import { Button, CloseIcon, Toast, Tooltip } from '@pluralsh/design-system'
import { useState } from 'react'

import { useNavigate } from 'react-router-dom'

import {
  KubernetesClusterFragment,
  PinnedCustomResourceFragment,
  useUnpinCustomResourceMutation,
} from '../../../generated/graphql'
import { Maybe } from '../../../generated/graphql-kubernetes'
import { useRefetch } from '../Cluster'
import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import { Kind } from '../common/types'
import { ApolloError } from '@apollo/client'

const DeleteIcon = styled(CloseIcon)(({ theme }) => ({
  marginLeft: theme.spacing.xxsmall,
  padding: theme.spacing.xxsmall,
  opacity: 0,
  '&:hover': {
    color: theme.colors['icon-danger'],
  },
}))

const LinkButton = styled(Button)(() => ({
  display: 'flex',
  [`:hover ${DeleteIcon}`]: { opacity: 1 },
}))

export default function PinnedCustomResourceDefinitions({
  cluster,
  pinnedResources,
}: {
  cluster?: KubernetesClusterFragment
  pinnedResources: Maybe<PinnedCustomResourceFragment>[]
}) {
  const theme = useTheme()
  const navigate = useNavigate()
  const refetchClusters = useRefetch()
  const [error, setError] = useState<ApolloError>()
  const [mutation] = useUnpinCustomResourceMutation({
    onCompleted: () => refetchClusters?.(),
    onError: (error) => {
      setError(error)
      setTimeout(() => setError(undefined), 3000)
    },
  })

  return (
    <div
      css={{
        display: 'flex',
        gap: theme.spacing.xxsmall,
        paddingBottom: theme.spacing.xxsmall,
        overflowX: 'auto',
        whiteSpace: 'nowrap',
      }}
    >
      {pinnedResources
        .filter((pr): pr is PinnedCustomResourceFragment => !!pr)
        .map(({ id, name, displayName }) => (
          <LinkButton
            tertiary
            onClick={() =>
              navigate(
                getResourceDetailsAbsPath(
                  cluster?.id,
                  Kind.CustomResourceDefinition,
                  name
                )
              )
            }
          >
            {displayName}
            <Tooltip label="Unpin custom resource">
              <DeleteIcon
                size={12}
                onClick={(e) => {
                  e.stopPropagation()
                  mutation({ variables: { id } })
                }}
              />
            </Tooltip>
          </LinkButton>
        ))}
      {error && (
        <Toast
          heading="Error unpinning resource"
          severity="danger"
          margin="large"
          marginRight="xxxxlarge"
        >
          {error.message}
        </Toast>
      )}
    </div>
  )
}
