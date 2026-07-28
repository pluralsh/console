import { Chip, Flex, TrashCanIcon } from '@pluralsh/design-system'
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
  getKubeDeleteDiffValues,
  getKubeDeleteResourceLabel,
  getKubeDeleteWarning,
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
  const shouldFetch = variant === 'update' || variant === 'delete'
  const { data, loading, error } = useWorkbenchJobKubeRequestDiffQuery({
    variables: { id: activityId },
    skip: !enabled || !activityId || !shouldFetch,
    fetchPolicy: 'network-only',
  })

  if (!shouldFetch) return null

  const liveKube = data?.workbenchJobActivity?.result?.kubeRequest
  const kube = liveKube ?? kubeRequest
  const { oldValue, newValue } =
    variant === 'delete'
      ? getKubeDeleteDiffValues(kube)
      : getKubeUpdateDiffValues(kube)
  const isDelete = variant === 'delete'

  if (loading && !liveKube) {
    return (
      <DiffSectionSC>
        {isDelete && <DeleteWarningBanner kubeRequest={kubeRequest} />}
        <CaptionP $color="text-xlight">
          {isDelete
            ? getKubeDeleteResourceLabel(kubeRequest).toUpperCase()
            : 'DIFF'}
        </CaptionP>
        <RectangleSkeleton
          $width="100%"
          $height={160}
        />
      </DiffSectionSC>
    )
  }

  if (error && !oldValue && !newValue) {
    return <GqlError error={error} />
  }

  if (!newValue && !oldValue) return null

  return (
    <DiffSectionSC>
      {isDelete && <DeleteWarningBanner kubeRequest={kube} />}
      <CaptionP $color="text-xlight">
        {isDelete ? getKubeDeleteResourceLabel(kube).toUpperCase() : 'DIFF'}
      </CaptionP>
      {error && <GqlError error={error} />}
      <DiffViewer
        splitView={false}
        hideLineNumbers={false}
        compareMethod={DiffMethod.LINES}
        oldValue={oldValue}
        newValue={
          isDelete ? newValue : newValue || toKubeYaml(kubeRequest?.body)
        }
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

function DeleteWarningBanner({
  kubeRequest,
}: {
  kubeRequest: KubeRequestLike | null | undefined
}) {
  return (
    <DeleteWarningSC>
      <TrashCanIcon
        size={16}
        color="icon-danger"
      />
      <span>{getKubeDeleteWarning(kubeRequest)}</span>
    </DeleteWarningSC>
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

const DeleteWarningSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  width: '100%',
  padding: theme.spacing.small,
  marginBottom: theme.spacing.xsmall,
  borderRadius: 12,
  backgroundColor: theme.colors.red[900],
  border: `1px solid ${theme.colors.red[850]}`,
  color: theme.colors['text-danger-light'],
}))
