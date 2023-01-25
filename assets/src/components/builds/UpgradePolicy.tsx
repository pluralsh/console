import { useMutation } from '@apollo/client'
import {
  Button,
  Chip,
  CollapseIcon,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { DELETE_POLICY, UPGRADE_POLICIES } from 'components/graphql/builds'
import { Collapsible } from 'grommet'
import { Flex, P } from 'honorable'
import { useState } from 'react'
import { updateCache } from 'utils/graphql'

export default function UpgradePolicy({ policy, last = false }) {
  const [open, setOpen] = useState<boolean>(false)
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
    <>
      <Flex
        align="center"
        borderBottom={!last && '1px solid border-fill-two'}
        cursor="pointer"
        gap="small"
        onClick={() => setOpen(!open)}
        padding="small"
        _hover={{ backgroundColor: 'fill-two-hover' }}
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
        <CollapseIcon
          marginLeft="8px"
          size={8}
          style={open ? {
            transform: 'rotate(270deg)',
            transitionDuration: '.2s',
            transitionProperty: 'transform',
          } : {
            transform: 'rotate(180deg)',
            transitionDuration: '.2s',
            transitionProperty: 'transform',
          }}
        />
      </Flex>
      <Collapsible
        open={open}
        direction="vertical"
      >
        <Flex
          backgroundColor="fill-three"
          borderBottom="1px solid border"
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
      </Collapsible>
    </>
  )
}
