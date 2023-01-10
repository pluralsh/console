import { Chip, ContentCard, Tooltip } from '@pluralsh/design-system'
import { LoginContext } from 'components/contexts'
import { ScrollablePage } from 'components/layout/ScrollablePage'
import { Flex, H3 } from 'honorable'
import { useContext } from 'react'

function _sanitize({
  name, repositories, permissions, roleBindings,
}) {
  return {
    name, repositories, permissions, roleBindings: roleBindings.map(sanitizeBinding),
  }
}

function sanitizeBinding({ user, group }) {
  if (user) return { user: { email: user.email } }
  if (group) return { group: { name: group.name } }
}

export function Permissions() {
  const { me } = useContext<any>(LoginContext)

  return (
    <ScrollablePage heading="Permissions">
      <ContentCard>
        <H3
          body1
          fontWeight="600"
          marginBottom="small"
        >
          Roles
        </H3>
        <Flex>
          {/* TODO: Check if <Highlight language="yaml">yaml.stringify(_sanitize(role))</Highlight>
           should be skipped. */}
          {me.boundRoles?.map(({ name, description }) => (
            <Tooltip label={description}><Chip>{name}</Chip></Tooltip>))}
        </Flex>
        {/* TODO: Add groups? */}
      </ContentCard>
    </ScrollablePage>
  )
}
