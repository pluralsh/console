import { Flex, Tab, TabList, TabPanel } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { Body1P } from 'components/utils/typography/Text'
import {
  ScmConnectionDocument,
  useRegisterGitHubAppMutation,
  useScmConnectionSuspenseQuery,
} from 'generated/graphql'
import { use, useLayoutEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import styled from 'styled-components'
import {
  CloudWelcomeCtx,
  CloudWelcomeStep,
} from '../../CloudConsoleWelcomeModal'
import { GitHubAppSetup } from './GitHubAppSetup'
import { ManualSetup } from './ManualGitSetup'

enum SetupType {
  GhApp = 'ghApp',
  Manual = 'manual',
}
const INSTALLATION_ID_PARAM = 'installation_id'

export function GitHubSetupStep() {
  const { setModalActions, setStep } = use(CloudWelcomeCtx)
  const [setupType, setSetupType] = useState<SetupType>(SetupType.GhApp)
  const tabStateRef = useRef<any>(null)
  const [params, setParams] = useSearchParams()
  const installationId = params.get(INSTALLATION_ID_PARAM)

  const { data, error: scmConnectionError } = useScmConnectionSuspenseQuery({
    variables: { name: 'plural' },
    fetchPolicy: 'cache-and-network',
  })

  const [
    registerGhApp,
    { loading: registerGhAppLoading, error: registerGhAppError },
  ] = useRegisterGitHubAppMutation({
    variables: { installationId: installationId ?? '', name: 'plural' },
    awaitRefetchQueries: true,
    refetchQueries: [
      { query: ScmConnectionDocument, variables: { name: 'plural' } },
    ],
  })

  useLayoutEffect(() => {
    setModalActions(null)
    if (!!data.scmConnection) {
      setStep(CloudWelcomeStep.Authenticate)
      return
    }
    if (installationId) registerGhApp()
  }, [data, installationId, registerGhApp, setModalActions, setStep, setupType])

  if (scmConnectionError) return <GqlError error={scmConnectionError} />

  return (
    <Flex
      direction="column"
      gap="medium"
    >
      {registerGhAppError && <GqlError error={registerGhAppError} />}
      <Body1P>
        Plural Console is best with a Git connection. You can either use the
        pre-made Plural GitHub application or install your own.
      </Body1P>
      <TabList
        stateRef={tabStateRef}
        stateProps={{
          orientation: 'horizontal',
          selectedKey: setupType,
          onSelectionChange: (key) => setSetupType(key as SetupType),
        }}
      >
        <StretchedTabSC key={SetupType.GhApp}>Install on GitHub</StretchedTabSC>
        <StretchedTabSC key={SetupType.Manual}>
          Manual installation
        </StretchedTabSC>
      </TabList>
      <TabPanel
        stateRef={tabStateRef}
        tabKey={setupType}
      >
        {setupType === SetupType.GhApp ? (
          <GitHubAppSetup
            submitInstallationId={(id) => {
              // this will trigger the mutation in the effect
              setParams({ [INSTALLATION_ID_PARAM]: id })
            }}
            loading={registerGhAppLoading}
          />
        ) : (
          <ManualSetup />
        )}
      </TabPanel>
    </Flex>
  )
}

const StretchedTabSC = styled(Tab)({
  flex: 1,
  '& *': { justifyContent: 'center' },
})
