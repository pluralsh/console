import {
  Button,
  Flex,
  FormField,
  Input,
  Tab,
  TabList,
  TabPanel,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { Body1P } from 'components/utils/typography/Text'
import {
  ScmConnectionDocument,
  useCreateScmWebhookMutation,
  useRegisterGitHubAppMutation,
  useScmConnectionSuspenseQuery,
} from 'generated/graphql'
import { use, useLayoutEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
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
  const { colors } = useTheme()
  const { setModalActions, setStep } = use(CloudWelcomeCtx)
  const [setupType, setSetupType] = useState<SetupType>(SetupType.GhApp)
  const tabStateRef = useRef<any>(null)
  const [params, setParams] = useSearchParams()
  const installationId = params.get(INSTALLATION_ID_PARAM)

  const [showWebhookSetup, setShowWebhookSetup] = useState(false)
  const [owner, setOwner] = useState('')

  const { data, error: scmConnectionError } = useScmConnectionSuspenseQuery({
    variables: { name: 'plural' },
    fetchPolicy: 'cache-and-network',
  })

  const [createWebhook, { loading: webhookLoading, error: webhookError }] =
    useCreateScmWebhookMutation({
      variables: { connectionId: data.scmConnection?.id ?? '', owner },
      onCompleted: () => {
        setParams(undefined)
        setShowWebhookSetup(false)
      },
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
    onCompleted: () => setShowWebhookSetup(true),
  })

  useLayoutEffect(() => {
    setModalActions(null)
    if (!!data.scmConnection) {
      // if the user installed manually, then there will be no installationId in the search params and this moves forward
      // when installing with our gh app, user needs to also create a webhook first which then clears the installationId
      if (!installationId) setStep(CloudWelcomeStep.Authenticate)
      else setShowWebhookSetup(true)
    } else if (installationId) registerGhApp()
  }, [data, installationId, registerGhApp, setModalActions, setStep, setupType])

  if (scmConnectionError) return <GqlError error={scmConnectionError} />

  return (
    <Flex
      direction="column"
      gap="medium"
    >
      {registerGhAppError && <GqlError error={registerGhAppError} />}
      {showWebhookSetup ? (
        <WebhookFormSC
          onSubmit={(e) => {
            e.preventDefault()
            createWebhook()
          }}
        >
          {webhookError && <GqlError error={webhookError} />}
          <Body1P>
            Please provide the repository owner so Plural can create a webhook
            to listen for updates.
          </Body1P>
          <FormField
            required
            label="Owner"
            hint="should be a GitHub organization or repo slug"
          >
            <Input
              placeholder="Enter repository owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            />
          </FormField>
          <Flex
            width="100%"
            justify="space-between"
          >
            <Button
              tertiary
              padding="none"
              css={{ color: colors['text-xlight'] }}
              onClick={() => setParams(undefined)}
            >
              {"Skip (I'll do it later)"}
            </Button>
            <Button
              type="submit"
              disabled={!owner}
              loading={webhookLoading}
            >
              Create webhook
            </Button>
          </Flex>
        </WebhookFormSC>
      ) : (
        <>
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
            <StretchedTabSC key={SetupType.GhApp}>
              Install on GitHub
            </StretchedTabSC>
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
        </>
      )}
    </Flex>
  )
}

const WebhookFormSC = styled.form(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  wordBreak: 'break-word',
}))

const StretchedTabSC = styled(Tab)({
  flex: 1,
  '& *': { justifyContent: 'center' },
})
