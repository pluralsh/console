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
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import { useAttachDevboxMutation, useDevboxesQuery } from 'generated/graphql'
import { useState } from 'react'
import { mapExistingNodes } from 'utils/graphql'
import { DevboxStatusChip } from './DevboxChips'
import { agentLabel } from './devboxStartForm'

export function DevboxAttachModal({
  open,
  onClose,
  workbenchId,
  attachedIds,
  onAttached,
}: {
  open: boolean
  onClose: () => void
  workbenchId: string
  attachedIds: string[]
  onAttached: () => void
}) {
  const { popToast } = useSimpleToast()
  const [q, setQ] = useState('')
  const query = useThrottle(q, 300)
  const { data, loading, error } = useDevboxesQuery({
    variables: { q: query || undefined },
    skip: !open,
    fetchPolicy: 'cache-and-network',
  })
  const [attach, { loading: attaching, error: attachError }] =
    useAttachDevboxMutation({
      onCompleted: ({ attachDevbox }) => {
        onAttached()
        popToast({
          content: `${attachDevbox?.name ?? 'Box'} attached`,
          severity: 'success',
        })
      },
    })
  const boxes = mapExistingNodes(data?.devboxes).filter(
    ({ id }) => !attachedIds.includes(id)
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      header="Attach a box"
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
          placeholder="Search boxes"
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
        />
        {error && <GqlError error={error} />}
        {attachError && <GqlError error={attachError} />}
        {!data && loading ? (
          <RectangleSkeleton
            $height={80}
            $width="100%"
          />
        ) : !boxes.length ? (
          <CaptionP $color="text-xlight">
            No other boxes found. Boxes are registered by applying a
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
                    {box.cluster?.name}
                    {' · '}
                    {(box.agents ?? [])
                      .map((a) => agentLabel(a?.type))
                      .join(', ')}
                  </CaptionP>
                </Flex>
                <Button
                  small
                  loading={attaching}
                  onClick={() =>
                    attach({ variables: { workbenchId, devboxId: box.id } })
                  }
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
