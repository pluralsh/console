import {
  Button,
  Chip,
  Code,
  ContentCard,
  Modal,
  Tooltip,
} from '@pluralsh/design-system'
import { LoginContext } from 'components/contexts'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { Flex, H3 } from 'honorable'
import { useContext, useMemo, useState } from 'react'
import { stringify } from 'yaml'

function sanitize({ name, repositories, permissions, roleBindings }) {
  return {
    name,
    repositories,
    permissions,
    roleBindings: roleBindings.map(sanitizeBinding),
  }
}

function sanitizeBinding({ user, group }) {
  if (user) return { user: { email: user.email } }
  if (group) return { group: { name: group.name } }
}

export default function Permissions() {
  const { me } = useContext<any>(LoginContext)
  const [role, setRole] = useState<any>(undefined)
  const raw = useMemo(() => (role ? stringify(sanitize(role)) : ''), [role])

  return (
    <>
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
            {me.boundRoles?.map((role) => (
              <Tooltip label={role.description}>
                <Chip
                  clickable
                  onClick={() => setRole(role)}
                >
                  {role.name}
                </Chip>
              </Tooltip>
            ))}
          </Flex>
        </ContentCard>
      </ScrollablePage>
      <Modal
        header="Role permissions"
        open={role}
        onClose={() => setRole(undefined)}
        actions={
          <Button
            secondary
            onClick={() => setRole(undefined)}
          >
            Okay
          </Button>
        }
        size="large"
      >
        <Code
          fillLevel={2}
          language="yaml"
          showHeader={false}
        >
          {raw}
        </Code>
      </Modal>
    </>
  )
}
