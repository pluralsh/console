import {
  Flex,
  SubTab,
  TabList,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { LinkTabWrap } from 'components/utils/Tabs'
import { InfraResearchFragment, useInfraResearchQuery } from 'generated/graphql'
import { truncate } from 'lodash'
import { useMemo, useRef } from 'react'
import { Outlet, useMatch } from 'react-router-dom'
import {
  AI_INFRA_RESEARCH_ABS_PATH,
  AI_INFRA_RESEARCH_ANALYSIS_REL_PATH,
  AI_INFRA_RESEARCH_DIAGRAM_REL_PATH,
  AI_INFRA_RESEARCH_PARAM_ID,
  AI_THREADS_REL_PATH,
} from 'routes/aiRoutesConsts'
import styled from 'styled-components'
import {
  getInfraResearchesBreadcrumbs,
  InfraResearchStatusChip,
} from './InfraResearches'
import { InfraResearchSidecar } from './InfraResearchSidecar'
import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { useLogin } from 'components/contexts'

const directory = [
  { path: AI_INFRA_RESEARCH_DIAGRAM_REL_PATH, label: 'Diagram' },
  { path: AI_INFRA_RESEARCH_ANALYSIS_REL_PATH, label: 'Analysis' },
  { path: AI_THREADS_REL_PATH, label: 'Threads' },
]

function getBreadcrumbs(
  infraResearch: Nullable<InfraResearchFragment>,
  tab: string
) {
  return [
    ...getInfraResearchesBreadcrumbs(),
    {
      label: truncate(infraResearch?.prompt ?? '', { length: 30 }),
      url: `${AI_INFRA_RESEARCH_ABS_PATH}/${infraResearch?.id}`,
    },
    {
      label: directory.find((d) => d.path === tab)?.path ?? '',
      url: `${AI_INFRA_RESEARCH_ABS_PATH}/${infraResearch?.id}/${tab}`,
    },
  ]
}

export type InfraResearchContextType = {
  infraResearch: Nullable<InfraResearchFragment>
}

export function InfraResearch() {
  const { me } = useLogin()
  const { researchId = '', tab = '' } =
    useMatch(
      `${AI_INFRA_RESEARCH_ABS_PATH}/:${AI_INFRA_RESEARCH_PARAM_ID}/:tab?/*`
    )?.params ?? {}
  const tabStateRef = useRef<any>(null)

  const { data, loading, error } = useInfraResearchQuery({
    variables: { id: researchId },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const infraResearch = data?.infraResearch

  useSetBreadcrumbs(
    useMemo(() => getBreadcrumbs(infraResearch, tab), [infraResearch, tab])
  )

  if (error)
    return (
      <GqlError
        margin="large"
        error={error}
      />
    )

  return (
    <MainContentSC>
      <Flex
        direction="column"
        gap="medium"
        flex={1}
      >
        <StretchedFlex>
          <TabList
            stateRef={tabStateRef}
            stateProps={{ selectedKey: tab }}
          >
            {directory
              .filter(({ path }) =>
                infraResearch?.user && me?.id === infraResearch.user.id
                  ? true
                  : path !== AI_THREADS_REL_PATH
              )
              .map(({ label, path }) => (
                <LinkTabWrap
                  subTab
                  key={path}
                  to={path}
                >
                  <SubTab key={path}>{label}</SubTab>
                </LinkTabWrap>
              ))}
          </TabList>
          <InfraResearchStatusChip status={infraResearch?.status} />
        </StretchedFlex>
        {!data && loading ? (
          <LoadingIndicator />
        ) : (
          <Outlet context={{ infraResearch }} />
        )}
      </Flex>
      <ResponsiveLayoutSidecarContainer css={{ width: 300 }}>
        <InfraResearchSidecar
          infraResearch={infraResearch}
          loading={loading}
        />
      </ResponsiveLayoutSidecarContainer>
    </MainContentSC>
  )
}

const MainContentSC = styled.div(({ theme }) => ({
  display: 'flex',
  padding: theme.spacing.large,
  maxWidth: theme.breakpoints.desktopLarge,
  alignSelf: 'center',
  width: '100%',
}))
