import {
  Button,
  Chip,
  Code,
  ContentCard,
  Flex,
  Modal,
  Tooltip,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { LoginContext } from 'components/contexts'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { useContext, useMemo, useState } from 'react'
import { stringify } from 'yaml'

import { Body1P } from 'components/utils/typography/Text'
import { useTheme } from 'styled-components'
import { PROFILE_BREADCRUMBS } from './MyProfile'

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

const breadcrumbs = [...PROFILE_BREADCRUMBS, { label: 'permissions' }]

export function Permissions() {
  const { spacing } = useTheme()
  useSetBreadcrumbs(breadcrumbs)
  const { me } = useContext<any>(LoginContext)
  const [role, setRole] = useState<any>(undefined)
  const raw = useMemo(() => (role ? stringify(sanitize(role)) : ''), [role])

  return (
    <>
      <ScrollablePage heading="Permissions">
        <ContentCard>
          <Body1P
            as="h3"
            css={{ marginBottom: spacing.small, fontWeight: 600 }}
          >
            Roles
          </Body1P>
          <Flex>
            {me.boundRoles?.map((role, i) => (
              <Tooltip
                key={i}
                label={role.description}
              >
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
