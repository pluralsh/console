import {
  ArrowTopRightIcon,
  Button,
  EmptyState,
  ReturnIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { getTabCrumb } from 'utils/getTabCrumb'
import { PageToolbar } from 'components/layout/PageToolbar'
import { GqlError } from 'components/utils/Alert'
import { PolicyFragment, usePolicyQuery } from 'generated/graphql'
import { ReactNode, useMemo, useState } from 'react'
import { Link, Outlet, useMatch, useParams } from 'react-router-dom'
import {
  POLICIES_ABS_PATH,
  POLICIES_ATTACHMENTS_REL_PATH,
  POLICIES_DEFINITION_REL_PATH,
  POLICIES_EVALUATIONS_REL_PATH,
  POLICIES_EVAL_PARAM_ID,
  POLICIES_PARAM_ID,
  POLICIES_REL_PATH,
  SECURITY_ABS_PATH,
  SECURITY_REL_PATH,
  getPolicyDetailsAbsPath,
} from 'routes/securityRoutesConsts'
import styled from 'styled-components'

export type PolicyDetailsContext = {
  policy: PolicyFragment | null | undefined
  loading: boolean
  setHeaderActions: (node: ReactNode) => void
}

export function PolicyDetails() {
  const id = useParams()[POLICIES_PARAM_ID]
  const tabMatch = useMatch(`${POLICIES_ABS_PATH}/:${POLICIES_PARAM_ID}/:tab`)
  const evalMatch = useMatch(
    `${POLICIES_ABS_PATH}/:${POLICIES_PARAM_ID}/${POLICIES_EVALUATIONS_REL_PATH}/:${POLICIES_EVAL_PARAM_ID}`
  )
  const tab = evalMatch
    ? POLICIES_EVALUATIONS_REL_PATH
    : (tabMatch?.params.tab ?? POLICIES_DEFINITION_REL_PATH)
  const evalId = evalMatch?.params[POLICIES_EVAL_PARAM_ID]
  const { data, loading, error } = usePolicyQuery({
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  })
  const policy = data?.policy
  const attachmentCount = policy
    ? (policy.workbenchAttachmentCount ?? 0) +
      (policy.stackAttachmentCount ?? 0)
    : undefined
  const directory = useMemo(
    () => [
      {
        label: 'Definition',
        path: getPolicyDetailsAbsPath(id ?? '', POLICIES_DEFINITION_REL_PATH),
      },
      {
        label: (
          <TabLabelWithCount
            label="Evaluations"
            count={policy?.evaluationCount}
          />
        ),
        path: getPolicyDetailsAbsPath(id ?? '', POLICIES_EVALUATIONS_REL_PATH),
      },
      {
        label: (
          <TabLabelWithCount
            label="Attachments"
            count={attachmentCount}
          />
        ),
        path: getPolicyDetailsAbsPath(id ?? '', POLICIES_ATTACHMENTS_REL_PATH),
      },
    ],
    [id, attachmentCount, policy?.evaluationCount]
  )

  useSetBreadcrumbs(
    useMemo(
      () => [
        { label: SECURITY_REL_PATH, url: SECURITY_ABS_PATH },
        { label: POLICIES_REL_PATH, url: POLICIES_ABS_PATH },
        {
          label: policy?.name ?? id ?? '',
          url: getPolicyDetailsAbsPath(id ?? ''),
        },
        ...getTabCrumb(`${POLICIES_ABS_PATH}/${id ?? ''}`, tab),
      ],
      [id, policy?.name, tab]
    )
  )

  const [headerActions, setHeaderActions] = useState<ReactNode>(null)
  const ctx: PolicyDetailsContext = useMemo(
    () => ({ policy, loading, setHeaderActions }),
    [policy, loading]
  )

  if (error) {
    return (
      <PageSC $padded>
        <GqlError
          margin="large"
          error={error}
        />
      </PageSC>
    )
  }

  if (!loading && !policy) {
    return (
      <PageSC $padded>
        <EmptyState message="Policy not found">
          <Button
            as={Link}
            to={POLICIES_ABS_PATH}
            startIcon={<ReturnIcon />}
          >
            Back to all policies
          </Button>
        </EmptyState>
      </PageSC>
    )
  }

  return (
    <PageSC>
      <PageToolbar
        tabs={directory}
        activeFn={(path) => path === getPolicyDetailsAbsPath(id ?? '', tab)}
      >
        {tab === POLICIES_EVALUATIONS_REL_PATH && evalId && (
          <Button
            small
            as={Link}
            to={`${getPolicyDetailsAbsPath(id ?? '', POLICIES_DEFINITION_REL_PATH)}?evalId=${evalId}`}
            endIcon={<ArrowTopRightIcon />}
          >
            Simulate with evaluation
          </Button>
        )}
        {tab === POLICIES_DEFINITION_REL_PATH && headerActions}
      </PageToolbar>
      <ContentSC
        $flush={
          tab === POLICIES_EVALUATIONS_REL_PATH ||
          tab === POLICIES_DEFINITION_REL_PATH
        }
      >
        <Outlet context={ctx} />
      </ContentSC>
    </PageSC>
  )
}

const PageSC = styled.div<{ $padded?: boolean }>(({ theme, $padded }) => ({
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1,
  height: '100%',
  width: '100%',
  minHeight: 0,
  overflow: 'hidden',
  ...($padded
    ? {
        paddingTop: theme.spacing.large,
        paddingLeft: theme.spacing.large,
        paddingRight: theme.spacing.large,
      }
    : {}),
}))

const ContentSC = styled.div<{ $flush?: boolean }>(({ theme, $flush }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  ...($flush ? {} : { padding: theme.spacing.large }),
}))

function TabLabelWithCount({
  label,
  count,
}: {
  label: string
  count?: number | null
}) {
  return (
    <TabLabelSC>
      {label}
      {count != null && <span css={{ fontWeight: 400 }}>{count}</span>}
    </TabLabelSC>
  )
}

// an explicit gap, as tabs lay out as flex and drop a plain space between
// the label and count
const TabLabelSC = styled.span(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'baseline',
  gap: theme.spacing.xsmall,
}))
