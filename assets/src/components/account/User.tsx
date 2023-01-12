import { useMutation } from '@apollo/client'
import { Box } from 'grommet'
import { Flex, Span } from 'honorable'
import { AppIcon, Chip, ListBoxItem } from '@pluralsh/design-system'
import { useContext } from 'react'
import { LoginContext } from 'components/contexts'

import { EDIT_USER } from './queries'
import { MoreMenu } from './MoreMenu'

export function UserInfo({ user: { email, name, avatar }, hue = 'lighter', ...box }: any) {
  return (
    <Box
      {...box}
      direction="row"
      gap="small"
      align="center"
    >
      <AppIcon
        url={avatar}
        name={name}
        spacing={avatar ? 'none' : undefined}
        size="xsmall"
        hue={hue}
      />
      <Box>
        <Span fontWeight="bold">{name}</Span>
        <Span color="text-light">{email}</Span>
      </Box>
    </Box>
  )
}

function UserEdit({ user }: any) {
  const [mutation] = useMutation(EDIT_USER, {
    variables: { id: user.id },
  })
  const isAdmin = !!user.roles?.admin

  const menuItems = {
    addAdmin: {
      label: isAdmin ? 'Remove admin role' : 'Add admin role',
      // @ts-expect-error
      onSelect: () => mutation({ variables: { attributes: { roles: { admin: !isAdmin } } } }),
      props: {},
    },
  }

  return (
    <MoreMenu
      onSelectionChange={selectedKey => {
        menuItems[selectedKey]?.onSelect()
      }}
    >
      {Object.entries(menuItems).map(([key, { label, props = {} }]) => (
        <ListBoxItem
          key={key}
          textValue={label}
          label={label}
          {...props}
          color="blue"
        />
      ))}
    </MoreMenu>
  )
}

export function User({ user }: any) {
  const { me } = useContext(LoginContext)

  return (
    <Box
      fill="horizontal"
      direction="row"
      align="center"
    >
      <UserInfo
        fill="horizontal"
        user={user}
      />
      <Flex
        gap="small"
        align="center"
      >
        {user.roles?.admin && (
          <Chip
            size="medium"
            hue="lighter"
          >
            Admin
          </Chip>
        )}
        {!!me.roles?.admin && <UserEdit user={user} />}
      </Flex>
    </Box>
  )
}
