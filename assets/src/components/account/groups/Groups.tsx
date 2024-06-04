import { useContext, useState } from 'react'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import BillingLegacyUserBanner from 'components/billing/BillingLegacyUserBanner'
import BillingFeatureBlockBanner from 'components/billing/BillingFeatureBlockBanner'
import SubscriptionContext from 'components/contexts/SubscriptionContext'

import { Card } from '@pluralsh/design-system'

import { useTheme } from 'styled-components'

import { GroupsList } from './GroupsList'
import GroupCreate from './GroupCreate'
import GroupSearchHeader from './GroupsSearchHeader'

export function Groups() {
  const theme = useTheme()
  const [q, setQ] = useState('')
  const { availableFeatures } = useContext(SubscriptionContext)
  const isAvailable = !!availableFeatures?.userManagement

  return (
    <ScrollablePage
      scrollable={false}
      heading="Groups"
      headingContent={<GroupCreate q={q} />}
    >
      <BillingLegacyUserBanner feature="groups" />
      {isAvailable ? (
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}
        >
          <Card css={{ marginBottom: theme.spacing.small }}>
            <GroupSearchHeader
              q={q}
              setQ={setQ}
            />
          </Card>
          <GroupsList q={q} />
        </div>
      ) : (
        <BillingFeatureBlockBanner
          feature="groups"
          description="Organize your users into groups to more easily apply permissions to sub-sections of your team. e.g. ops, end-users, and admins."
          placeholderImageURL="/placeholder-groups.png"
        />
      )}
    </ScrollablePage>
  )
}
