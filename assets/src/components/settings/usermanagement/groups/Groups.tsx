import BillingFeatureBlockBanner from 'components/billing/BillingFeatureBlockBanner'
import SubscriptionContext from 'components/contexts/SubscriptionContext'
import { use, useState } from 'react'

import { Button, useSetBreadcrumbs } from '@pluralsh/design-system'

import { getUserManagementBreadcrumbs } from '../UserManagement'

import { StretchedFlex } from 'components/utils/StretchedFlex'
import { Body1P } from 'components/utils/typography/Text'
import styled from 'styled-components'
import { GroupsList } from './GroupsList'
import { GroupFragment } from 'generated/graphql'
import { GroupEditOrCreate } from './GroupEditOrCreate'

export const GROUP_CREATE_ID_KEY = 'create-group' as const
export type GroupEditT = GroupFragment | typeof GROUP_CREATE_ID_KEY

const breadcrumbs = getUserManagementBreadcrumbs('groups')

export function Groups() {
  const { availableFeatures } = use(SubscriptionContext)

  const [groupEdit, setGroupEdit] = useState<Nullable<GroupEditT>>(null)

  const isAvailable = !!availableFeatures?.userManagement

  useSetBreadcrumbs(breadcrumbs)

  if (groupEdit)
    return (
      <GroupEditOrCreate
        group={groupEdit}
        setGroupEdit={setGroupEdit}
      />
    )
  return (
    <WrapperSC>
      <StretchedFlex>
        <Body1P $color="text-light">
          Create and manage permission groups.
        </Body1P>
        <Button
          floating
          onClick={() => setGroupEdit(GROUP_CREATE_ID_KEY)}
        >
          Create group
        </Button>
      </StretchedFlex>
      {isAvailable ? (
        <GroupsList setGroupEdit={setGroupEdit} />
      ) : (
        <BillingFeatureBlockBanner
          feature="groups"
          description="Organize your users into groups to more easily apply permissions to sub-sections of your team. e.g. ops, end-users, and admins."
          placeholderImageURL="/placeholder-groups.png"
        />
      )}
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  minHeight: 0,
  height: '100%',
}))
