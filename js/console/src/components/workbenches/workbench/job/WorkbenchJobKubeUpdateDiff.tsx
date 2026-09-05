import {
  Chip,
  DiffMethod,
  DiffViewer,
  Flex,
  TrashCanIcon,
  WarningIcon,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { CaptionP } from 'components/utils/typography/Text'
import {
  useWorkbenchJobKubeRequestDiffQuery,
  WorkbenchJobActivityType,
} from 'generated/graphql'
import { ReactNode } from 'react'
import styled, { useTheme } from 'styled-components'
import {
  getKubeActionVariant,
  getKubeDeleteDiffValues,
  getKubeDeleteResourceLabel,
  getKubeDeleteWarning,
  getKubeUpdateDiffValues,
  isServerSideApplyKubeRequest,
  isKubeSecretRequest,
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
  const shouldFetch =
    variant === 'create' || variant === 'update' || variant === 'delete'
  const { data, loading, error } = useWorkbenchJobKubeRequestDiffQuery({
    variables: { id: activityId },
    skip: !enabled || !activityId || !shouldFetch,
    fetchPolicy: 'network-only',
  })

  if (!shouldFetch) return null

  const liveKube = data?.workbenchJobActivity?.result?.kubeRequest
  const kube = liveKube ?? kubeRequest
  const secretProtected = isKubeSecretRequest(kube)
  const serverSideApply = isServerSideApplyKubeRequest(kube)
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

  if (error && !oldValue && !newValue && !secretProtected) {
    return <GqlError error={error} />
  }

  if (secretProtected && !oldValue && !newValue) {
    return (
      <DiffSectionSC>
        {isDelete && <DeleteWarningBanner kubeRequest={kube} />}
        <CaptionP $color="text-xlight">
          {isDelete ? getKubeDeleteResourceLabel(kube).toUpperCase() : 'DIFF'}
        </CaptionP>
        <CaptionP $color="text-light">
          Secret payloads are hidden from workbench readers. Approve or deny
          based on the request path and method.
        </CaptionP>
      </DiffSectionSC>
    )
  }

  if (!newValue && !oldValue) return null

  return (
    <DiffSectionSC>
      {isDelete && <DeleteWarningBanner kubeRequest={kube} />}
      <CaptionP $color="text-xlight">
        {isDelete ? getKubeDeleteResourceLabel(kube).toUpperCase() : 'DIFF'}
      </CaptionP>
      {serverSideApply && (
        <CaptionP $color="text-light">
          Server-side apply only changes the fields shown here; omitted fields
          remain in place.
        </CaptionP>
      )}
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
    <DeleteWarningSC role="alert">
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
  drain,
  statusChip,
}: {
  type: Nullable<WorkbenchJobActivityType>
  method: string | null | undefined
  drain?: boolean
  statusChip?: ReactNode
}) {
  if (type !== WorkbenchJobActivityType.Kubernetes) {
    return <>{statusChip}</>
  }

  const chip = KUBE_VARIANT_CHIPS[getKubeActionVariant(method, drain)]

  return (
    <Flex
      align="center"
      gap="xsmall"
      css={{ flexShrink: 0, flexWrap: 'nowrap' }}
    >
      {chip && (
        <Chip
          size="small"
          severity={chip.severity}
          css={{ flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          {chip.label}
        </Chip>
      )}
      {statusChip}
    </Flex>
  )
}

const KUBE_VARIANT_CHIPS = {
  create: { severity: 'success', label: 'Create' },
  update: { severity: 'info', label: 'Update' },
  delete: { severity: 'danger', label: 'Delete' },
  drain: { severity: 'warning', label: 'Drain' },
  other: null,
} as const

export function WorkbenchJobKubeDrainDetails({
  node,
  explanation,
}: {
  node?: string | null
  explanation?: string | null
}) {
  const nodeName = node?.trim() || 'this node'

  return (
    <DrainDetailsSC>
      {!!explanation?.trim() && (
        <div>
          <CaptionP $color="text-xlight">EXPLANATION</CaptionP>
          <CaptionP $color="text-light">{explanation}</CaptionP>
        </div>
      )}
      <DrainWarningSC role="alert">
        <WarningIcon
          size={16}
          color="icon-warning"
        />
        <span>
          Draining <strong>{nodeName}</strong> will cordon the node and evict
          its workloads. Pod disruption budgets and Kubernetes RBAC remain
          enforced.
        </span>
      </DrainWarningSC>
    </DrainDetailsSC>
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

const DrainWarningSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  width: '100%',
  padding: theme.spacing.small,
  borderRadius: 12,
  backgroundColor: theme.colors['fill-two'],
  border: `1px solid ${theme.colors['border-warning']}`,
  color: theme.colors['text-light'],
  strong: {
    color: theme.colors.text,
  },
}))

const DrainDetailsSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
}))
