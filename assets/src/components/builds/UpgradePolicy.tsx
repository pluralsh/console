import { useMutation } from '@apollo/client'
import {
  Button,
  Chip,
  CollapseIcon,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { DELETE_POLICY, UPGRADE_POLICIES } from 'components/graphql/builds'
import { Collapsible } from 'grommet'
import { Flex } from 'honorable'
import { useState } from 'react'
import { updateCache } from 'utils/graphql'
import { useTheme } from 'styled-components'

export default function UpgradePolicy({ policy, last = false }) {
  const theme = useTheme()
  const [open, setOpen] = useState<boolean>(false)
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
            <p
              css={{
                ...theme.partials.text.body2,
                fontWeight: 600,
              }}
            >
              {policy.name}
            </p>
            <Chip
              size="small"
              textTransform="capitalize"
            >
              {policy.type?.toLowerCase()}
            </Chip>
          </Flex>
          <p
            css={{
              ...theme.partials.text.body2,
              color: theme.colors['text-light'],
            }}
          >
            App bindings: {policy.target}
          </p>
        </Flex>
        <Flex grow={1} />
        <Chip>Weight: {policy.weight}</Chip>
        <CollapseIcon
          marginLeft="8px"
          size={8}
          style={
            open
              ? {
                  transform: 'rotate(270deg)',
                  transitionDuration: '.2s',
                  transitionProperty: 'transform',
                }
              : {
                  transform: 'rotate(180deg)',
                  transitionDuration: '.2s',
                  transitionProperty: 'transform',
                }
          }
        />
      </Flex>
      <Collapsible
        open={open}
        direction="vertical"
      >
        <Flex
          backgroundColor="fill-zero"
          borderBottom="1px solid border-zero"
          direction="column"
          gap="medium"
          padding="small"
        >
          <p
            css={{
              ...theme.partials.text.body2,
              color: theme.colors['text-light'],
              wordBreak: 'break-word',
            }}
          >
            {policy.description || 'No description.'}
          </p>
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
