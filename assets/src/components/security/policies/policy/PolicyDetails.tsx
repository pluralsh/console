import {
  ArrowTopRightIcon,
  Button,
  EmptyState,
  Flex,
  ReturnIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { getTabCrumb } from 'utils/getTabCrumb'
import { GqlError } from 'components/utils/Alert'
import { SubTabs } from 'components/utils/SubTabs'
import { StackedText } from 'components/utils/table/StackedText'
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
            count={policy?.attachmentCount}
          />
        ),
        path: getPolicyDetailsAbsPath(id ?? '', POLICIES_ATTACHMENTS_REL_PATH),
      },
    ],
    [id, policy?.attachmentCount, policy?.evaluationCount]
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
      <HeaderSC>
        <StackedText
          loading={loading && !policy}
          first={policy?.name}
          firstPartialType="subtitle1"
          firstColor="text"
          second={policy?.description}
          secondPartialType="body2"
          secondColor="text-xlight"
          gap="xxsmall"
        />
        <Flex
          align="center"
          gap="small"
        >
          <SubTabs
            directory={directory}
            activeFn={(path) => path === getPolicyDetailsAbsPath(id ?? '', tab)}
          />
          <Flex grow={1} />
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
        </Flex>
      </HeaderSC>
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

const HeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  gap: theme.spacing.large,
  padding: theme.spacing.large,
}))

const ContentSC = styled.div<{ $flush?: boolean }>(({ theme, $flush }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  ...($flush
    ? {}
    : {
        paddingLeft: theme.spacing.large,
        paddingRight: theme.spacing.large,
      }),
}))

function TabLabelWithCount({
  label,
  count,
}: {
  label: string
  count?: number | null
}) {
  return (
    <>
      {label}
      {count == null ? null : (
        <>
          {' '}
          <span css={{ fontWeight: 400 }}>{count}</span>
        </>
      )}
    </>
  )
}
