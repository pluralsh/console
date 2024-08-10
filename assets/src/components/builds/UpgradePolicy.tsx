import { useMutation } from '@apollo/client'
import {
  AccordionItem,
  Button,
  Chip,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { DELETE_POLICY, UPGRADE_POLICIES } from 'components/graphql/builds'
import { Flex, P } from 'honorable'
import { useTheme } from 'styled-components'
import { updateCache } from 'utils/graphql'

export default function UpgradePolicy({ policy, last = false }) {
  const theme = useTheme()
  const [mutation] = useMutation(DELETE_POLICY, {
    variables: { id: policy.id },
    update: (cache, { data: { deleteUpgradePolicy } }) =>
      updateCache(cache, {
        query: UPGRADE_POLICIES,
        update: (prev) => ({
          ...prev,
          upgradePolicies: prev.upgradePolicies.filter(
            ({ id }) => id !== deleteUpgradePolicy.id
          ),
        }),
      }),
  })

  return (
    <AccordionItem
      css={{
        borderBottom: !last ? theme.borders['fill-two'] : undefined,
      }}
      paddingArea="trigger-only"
      trigger={
        <Flex
          align="center"
          flex={1}
          marginRight={theme.spacing.large}
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
        </Flex>
      }
    >
      <Flex
        backgroundColor="fill-zero"
        borderBottom="1px solid border-zero"
        direction="column"
        gap="medium"
        padding="small"
      >
        <P
          body2
          color="text-light"
          wordBreak="break-word"
        >
          {policy.description || 'No description.'}
        </P>
        <Flex justify="end">
          <Button
            secondary
            small
            destructive
            startIcon={<TrashCanIcon />}
            onClick={() => mutation()}
          >
            Delete
          </Button>
        </Flex>
      </Flex>
    </AccordionItem>
  )
}
