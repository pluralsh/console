import styled from 'styled-components'
import {
  CloseIcon,
  SubTab,
  TabList,
  Toast,
  Tooltip,
} from '@pluralsh/design-system'
import React, { useRef, useState } from 'react'
import { ApolloError } from 'apollo-boost'

import { LinkTabWrap } from '../../utils/Tabs'
import {
  KubernetesClusterFragment,
  PinnedCustomResourceFragment,
  useUnpinCustomResourceMutation,
} from '../../../generated/graphql'
import { Maybe } from '../../../generated/graphql-kubernetes'
import { useRefetch } from '../Cluster'
import { getResourceDetailsAbsPath } from '../../../routes/kubernetesRoutesConsts'
import { Kind } from '../common/types'

const DeleteIcon = styled(CloseIcon)(({ theme }) => ({
  marginLeft: theme.spacing.xxsmall,
  padding: theme.spacing.xxsmall,
  opacity: 0,
  '&:hover': {
    color: theme.colors['icon-danger'],
  },
}))

const LinkContainer = styled(LinkTabWrap)(() => ({
  [`:hover ${DeleteIcon}`]: { opacity: 1 },
}))

export default function PinnedCustomResourceDefinitions({
  cluster,
  pinnedResources,
}: {
  cluster?: KubernetesClusterFragment
  pinnedResources: Maybe<PinnedCustomResourceFragment>[]
}) {
  const refetchClusters = useRefetch()
  const tabStateRef = useRef<any>(null)
  const [error, setError] = useState<ApolloError>()
  const [mutation] = useUnpinCustomResourceMutation({
    onCompleted: () => refetchClusters?.(),
    onError: (error) => {
      setError(error)
      setTimeout(() => setError(undefined), 3000)
    },
  })

  return (
    <TabList
      scrollable
      gap="xxsmall"
      stateRef={tabStateRef}
      stateProps={{ orientation: 'horizontal', selectedKey: '' }}
      paddingBottom="xxsmall"
    >
      <>
        {pinnedResources
          .filter((pr): pr is PinnedCustomResourceFragment => !!pr)
          .map(({ id, name, displayName }) => (
            <LinkContainer
              subTab
              key={name}
              textValue={name}
              to={getResourceDetailsAbsPath(
                cluster?.id,
                Kind.CustomResourceDefinition,
                name
              )}
            >
              <SubTab
                key={name}
                textValue={name}
                css={{ display: 'flex' }}
              >
                {displayName}
                <Tooltip label="Unpin custom resource">
                  <DeleteIcon
                    size={12}
                    onClick={(e) => {
                      e.preventDefault()
                      mutation({ variables: { id } })
                    }}
                  />
                </Tooltip>
              </SubTab>
            </LinkContainer>
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
      </>
    </TabList>
  )
}
