import { Chip, Flex } from '@pluralsh/design-system'
import DiffViewer from 'components/utils/DiffViewer'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { CaptionP } from 'components/utils/typography/Text'
import {
  useWorkbenchJobKubeRequestDiffQuery,
  WorkbenchJobActivityType,
} from 'generated/graphql'
import { ReactNode } from 'react'
import { DiffMethod } from 'react-diff-viewer-continued'
import styled, { useTheme } from 'styled-components'
import {
  getKubeActionVariant,
  getKubeUpdateDiffValues,
  KubeRequestLike,
  toKubeYaml,
} from './workbenchJobKubeActionUtils'

export function WorkbenchJobKubeUpdateDiff({
  activityId,
  kubeRequest,
  enabled,
}: {
  activityId: string
  kubeRequest: KubeRequestLike | null | undefined
  enabled: boolean
}) {
  const theme = useTheme()
  const variant = getKubeActionVariant(kubeRequest?.method)
  const { data, loading, error } = useWorkbenchJobKubeRequestDiffQuery({
    variables: { id: activityId },
    skip: !enabled || !activityId || variant !== 'update',
    fetchPolicy: 'network-only',
  })

  if (variant !== 'update') return null

  const liveKube = data?.workbenchJobActivity?.result?.kubeRequest
  const { oldValue, newValue } = getKubeUpdateDiffValues(
    liveKube ?? kubeRequest
  )

  if (loading && !liveKube) {
    return (
      <DiffSectionSC>
        <CaptionP $color="text-xlight">DIFF</CaptionP>
        <RectangleSkeleton
          $width="100%"
          $height={160}
        />
      </DiffSectionSC>
    )
  }

  if (error && !newValue) {
    return <GqlError error={error} />
  }

  if (!newValue && !oldValue) return null

  return (
    <DiffSectionSC>
      <CaptionP $color="text-xlight">DIFF</CaptionP>
      {error && <GqlError error={error} />}
      <DiffViewer
        splitView={false}
        hideLineNumbers={false}
        compareMethod={DiffMethod.LINES}
        oldValue={oldValue}
        newValue={newValue || toKubeYaml(kubeRequest?.body)}
        cardProps={{
          fillLevel: 2,
          css: {
            background: theme.colors['fill-two'],
            border: 'none',
            maxHeight: 360,
          },
        }}
      />
    </DiffSectionSC>
  )
}

export function WorkbenchJobKubeActionChips({
  type,
  method,
  statusChip,
}: {
  type: Nullable<WorkbenchJobActivityType>
  method: string | null | undefined
  statusChip: ReactNode
}) {
  if (type !== WorkbenchJobActivityType.Kubernetes) {
    return <>{statusChip}</>
  }

  const variant = getKubeActionVariant(method)

  return (
    <Flex
      align="center"
      gap="xsmall"
    >
      {variant === 'update' && (
        <Chip
          size="small"
          severity="info"
        >
          Update
        </Chip>
      )}
      {variant === 'delete' && (
        <Chip
          size="small"
          severity="danger"
        >
          Delete
        </Chip>
      )}
      {statusChip}
    </Flex>
  )
}

const DiffSectionSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
  minWidth: 0,
  width: '100%',
}))
