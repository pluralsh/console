import { useQuery } from '@apollo/client'
import { ArrowLeftIcon, Button, Card } from '@pluralsh/design-system'
import { UPGRADE_POLICIES } from 'components/graphql/builds'
import { Flex } from 'honorable'
import { isEmpty } from 'lodash'
import { useContext } from 'react'

import { PolicyContext } from './UpgradePolicies'

import UpgradePolicy from './UpgradePolicy'
import UpgradePolicyCreate from './UpgradePolicyCreate'

export default function UpgradePoliciesList() {
  const { setModal } = useContext<any>(PolicyContext)
  const { data } = useQuery(UPGRADE_POLICIES, { fetchPolicy: 'cache-and-network' })

  if (!data) return null

  const { upgradePolicies } = data

  return (
    <>
      {!isEmpty(upgradePolicies) ? (
        <Card
          fillLevel={2}
          maxHeight={300}
          overflowY="auto"
        >
          {upgradePolicies.map(policy => (
            <UpgradePolicy
              key={policy.id}
              policy={policy}
            />
          ))}
        </Card>
      ) : 'No upgrade policies available.'}
      <Flex
        gap="medium"
        justify="end"
        marginTop="large"
      >
        <Button
          fontWeight={600}
          onClick={() => setModal(null)}
          secondary
        >
          Cancel
        </Button>
        <Button
          fontWeight={600}
          onClick={() => setModal({
            header: (
              <Button
                fontWeight={600}
                onClick={() => setModal({
                  header: 'Upgrade Policies',
                  content: <UpgradePoliciesList />,
                })}
                startIcon={<ArrowLeftIcon />}
                tertiary
              >
                Back to policies
              </Button>),
            content: <UpgradePolicyCreate />,
          })}
        >
          New policy
        </Button>
      </Flex>
    </>
  )
}
