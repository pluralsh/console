import {
  Button,
  EmptyState,
  ReturnIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { SubTabs } from 'components/utils/SubTabs'
import { StackedText } from 'components/utils/table/StackedText'
import { PolicyFragment, usePolicyQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { Link, Outlet, useMatch, useParams } from 'react-router-dom'
import {
  POLICIES_ABS_PATH,
  POLICIES_ATTACHMENTS_REL_PATH,
  POLICIES_DEFINITION_REL_PATH,
  POLICIES_EVALUATIONS_REL_PATH,
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
}

const directory = [
  { label: 'Definition', path: POLICIES_DEFINITION_REL_PATH },
  { label: 'Evaluations', path: POLICIES_EVALUATIONS_REL_PATH },
  { label: 'Attachments', path: POLICIES_ATTACHMENTS_REL_PATH },
]

export function PolicyDetails() {
  const id = useParams()[POLICIES_PARAM_ID]
  const { tab = POLICIES_DEFINITION_REL_PATH } =
    useMatch(`${POLICIES_ABS_PATH}/:${POLICIES_PARAM_ID}/:tab`)?.params ?? {}
  const { data, loading, error } = usePolicyQuery({
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  })
  const policy = data?.policy

  useSetBreadcrumbs(
    useMemo(
      () => [
        { label: SECURITY_REL_PATH, url: SECURITY_ABS_PATH },
        { label: POLICIES_REL_PATH, url: POLICIES_ABS_PATH },
        {
          label: policy?.name ?? id ?? '',
          url: getPolicyDetailsAbsPath(id ?? ''),
        },
        { label: tab, url: getPolicyDetailsAbsPath(id ?? '', tab) },
      ],
      [id, policy?.name, tab]
    )
  )

  const ctx: PolicyDetailsContext = useMemo(
    () => ({ policy, loading }),
    [policy, loading]
  )

  if (error) {
    return (
      <GqlError
        margin="large"
        error={error}
      />
    )
  }

  if (!loading && !policy) {
    return (
      <EmptyState message="Policy not found">
        <Button
          as={Link}
          to={POLICIES_ABS_PATH}
          startIcon={<ReturnIcon />}
        >
          Back to all policies
        </Button>
      </EmptyState>
    )
  }

  return (
    <WrapperSC>
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
      <SubTabs
        directory={directory}
        activeFn={(path) => path === tab}
      />
      <Outlet context={ctx} />
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  gap: theme.spacing.large,
  minHeight: 0,
  minWidth: 0,
  height: '100%',
  overflow: 'hidden',
}))
