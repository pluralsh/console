import {
  Button,
  Chip,
  Code,
  Flex,
  Modal,
  Tooltip,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { useMemo, useState } from 'react'
import { stringify } from 'yaml'

import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { GroupFragment, useMeGroupsQuery } from 'generated/graphql'
import { PROFILE_BREADCRUMBS } from './MyProfile'
import { ProfileCard } from './Profile'

const breadcrumbs = [...PROFILE_BREADCRUMBS, { label: 'groups' }]

export function Groups() {
  useSetBreadcrumbs(breadcrumbs)

  const [selectedGroup, setSelectedGroup] =
    useState<Nullable<GroupFragment>>(null)
  const { data, loading, error } = useMeGroupsQuery({
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const raw = useMemo(
    () => (selectedGroup ? stringify(sanitize(selectedGroup)) : ''),
    [selectedGroup]
  )

  if (error) return <GqlError error={error} />
  if (!data && loading) return <LoadingIndicator />

  return (
    <>
      <ScrollablePage heading="Groups">
        <ProfileCard>
          <Flex
            wrap="wrap"
            gap="small"
          >
            {data?.me?.groups?.map((group, i) => (
              <Tooltip
                key={i}
                label={group?.description}
              >
                <Chip
                  clickable
                  onClick={() => setSelectedGroup(group)}
                >
                  {group?.name}
                </Chip>
              </Tooltip>
            ))}
          </Flex>
        </ProfileCard>
      </ScrollablePage>
      <Modal
        header="Group details"
        open={!!selectedGroup}
        onClose={() => setSelectedGroup(null)}
        size="auto"
        actions={
          <Button
            secondary
            onClick={() => setSelectedGroup(null)}
          >
            Close
          </Button>
        }
      >
        <Code
          language="yaml"
          showHeader={false}
        >
          {raw}
        </Code>
      </Modal>
    </>
  )
}

const sanitize = ({ name, description }: GroupFragment) => ({
  name,
  description,
})
