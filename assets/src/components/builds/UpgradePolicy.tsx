import { useMutation } from '@apollo/client'
import { Chip, IconFrame, TrashCanIcon } from '@pluralsh/design-system'
import { DELETE_POLICY, UPGRADE_POLICIES } from 'components/graphql/builds'
import { Flex, P } from 'honorable'
import { updateCache } from 'utils/graphql'

// TODO: Add description.
export default function UpgradePolicy({ policy }) {
  const [mutation] = useMutation(DELETE_POLICY, {
    variables: { id: policy.id },
    update: (cache, { data: { deleteUpgradePolicy } }) => updateCache(cache, {
      query: UPGRADE_POLICIES,
      update: prev => ({
        ...prev,
        upgradePolicies: prev.upgradePolicies.filter(({ id }) => id !== deleteUpgradePolicy.id),
      }),
    }),
  })

  return (
    <Flex
      align="center"
      borderBottom="1px solid border"
      gap="small"
      padding="small"
    >
      <Flex
        direction="column"
        gap="xxxsmall"
      >
        <Flex gap="small">
          <P
            body2
            fontWeight={600}
          >
            {policy.name}
          </P>
          <Chip
            size="small"
            textTransform="capitalize"
          >
            {policy.type?.toLowerCase()}
          </Chip>
        </Flex>
        <P
          body2
          color="text-light"
        >
          App bindings: {policy.target}
        </P>
      </Flex>
      <Flex grow={1} />
      <Chip>Weight: {policy.weight}</Chip>
      <IconFrame
        size="medium"
        clickable
        icon={<TrashCanIcon color="icon-danger" />}
        textValue="Delete"
        onClick={() => mutation()}
        hue="lighter"
      />
    </Flex>
  )
}
