import {
  Button,
  Card,
  Flex,
  Input,
  Modal,
  SearchIcon,
} from '@pluralsh/design-system'
import { useThrottle } from 'components/hooks/useThrottle'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import { DevboxTinyFragment, useDevboxesQuery } from 'generated/graphql'
import { useState } from 'react'
import { mapExistingNodes } from 'utils/graphql'
import { DevboxStatusChip } from './DevboxChips'
import { devboxSizing } from './devboxSizing'

export function DevboxAttachModal({
  open,
  onClose,
  attachedIds,
  onAttach,
}: {
  open: boolean
  onClose: () => void
  attachedIds: string[]
  onAttach: (box: DevboxTinyFragment) => void
}) {
  const [q, setQ] = useState('')
  const query = useThrottle(q, 300)
  const { data, loading, error } = useDevboxesQuery({
    variables: { q: query || undefined },
    skip: !open,
    fetchPolicy: 'cache-and-network',
  })
  const boxes = mapExistingNodes(data?.devboxes).filter(
    ({ id }) => !attachedIds.includes(id)
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      header="Attach a devbox"
      size="large"
      actions={
        <Button
          secondary
          onClick={onClose}
        >
          Done
        </Button>
      }
    >
      <Flex
        direction="column"
        gap="small"
      >
        <Input
          startIcon={<SearchIcon />}
          placeholder="Search devboxes"
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
        />
        {error && <GqlError error={error} />}
        {!data && loading ? (
          <RectangleSkeleton
            $height={80}
            $width="100%"
          />
        ) : !boxes.length ? (
          <CaptionP $color="text-xlight">
            No other devboxes found. They're registered by applying a
            DevboxRunner in a cluster with Agent Substrate installed.
          </CaptionP>
        ) : (
          boxes.map((box) => (
            <Card
              key={box.id}
              css={{ padding: 12 }}
            >
              <Flex
                justify="space-between"
                align="center"
                gap="small"
              >
                <Flex
                  direction="column"
                  gap="xxsmall"
                >
                  <Flex
                    gap="xsmall"
                    align="center"
                  >
                    <Body2BoldP>{box.name}</Body2BoldP>
                    <DevboxStatusChip status={box.status} />
                  </Flex>
                  <CaptionP $color="text-xlight">
                    {[devboxSizing(box.resources), box.cluster?.name]
                      .filter(Boolean)
                      .join(' · ')}
                  </CaptionP>
                </Flex>
                <Button
                  small
                  onClick={() => onAttach(box)}
                >
                  Attach
                </Button>
              </Flex>
            </Card>
          ))
        )}
      </Flex>
    </Modal>
  )
}
