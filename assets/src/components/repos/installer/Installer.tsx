import React, {
  Dispatch,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  GraphQLToast,
  LoopingLogo,
  Wizard,
  WizardNavigation,
  WizardStepConfig,
  WizardStepper,
} from '@pluralsh/design-system'
import { Box } from 'grommet'
import { useApolloClient, useQuery } from '@apollo/client'
import { useNavigate } from 'react-router-dom'

import { SEARCH_REPOS } from '../../graphql/plural'
import { InstallationContext } from '../../Installations'
import { BUILDS_Q } from '../../graphql/builds'
import { appendConnection } from '../../../utils/graphql'

import { buildSteps, install, toDefaultSteps } from './helpers'

export function Installer({ setOpen, setConfirmClose, setVisible }) {
  const client = useApolloClient()
  const navigate = useNavigate()
  const onResetRef = useRef<{onReset: Dispatch<void>}>({ onReset: () => {} })
  const [inProgress, setInProgress] = useState<boolean>(false)
  const [steps, setSteps] = useState<Array<WizardStepConfig>>([])
  const [stepsLoading, setStepsLoading] = useState(false)
  const [error, setError] = useState()
  const [defaultSteps, setDefaultSteps] = useState<Array<WizardStepConfig>>([])
  const { applications: installedApplications } = useContext(InstallationContext as React.Context<any>)
  const { data: { repositories: { edges: applicationNodes } = { edges: undefined } } = {}, loading } = useQuery(SEARCH_REPOS, {
    variables: { query: '' },
  })

  const applications = useMemo(() => applicationNodes?.map(({ node }) => node), [applicationNodes])
  const installableApplications = useMemo(() => applications?.filter(app => !installedApplications?.find(s => s.name === app.name)),
    [applications, installedApplications])

  const onInstall = useCallback((payload: Array<WizardStepConfig>) => {
    setStepsLoading(true)

    install(client, payload)
      .then(responses => {
        responses.forEach(({ data: { installRecipe } }) => {
          const builds = client.cache.readQuery({ query: BUILDS_Q })

          client.cache.writeQuery({
            query: BUILDS_Q,
            data: appendConnection(builds, installRecipe, 'builds'),
          })
        })
      }).catch(err => setError(err))
      .finally(() => {
        setStepsLoading(false)
        setOpen(false)
        setVisible(true)
        navigate('/builds')
      })
  }, [client, setOpen, setVisible, navigate])

  const onSelect = useCallback(selectedApplications => {
    const build = async () => {
      const steps = await buildSteps(client, selectedApplications)

      setSteps(steps)
    }

    setStepsLoading(true)
    build()
      .then(() => setStepsLoading(false))
      .catch(err => {
        setError(err)
        setStepsLoading(false)
        onResetRef?.current?.onReset()
      })
  }, [client])

  useEffect(() => setDefaultSteps(toDefaultSteps(installableApplications)), [installableApplications])

  if (loading || defaultSteps.length === 0) {
    return (
      <Box
        overflow="hidden"
        fill="vertical"
        justify="center"
      >
        <LoopingLogo />
      </Box>
    )
  }

  return (
    <>
      {error && (
        <GraphQLToast
          onClose={() => setError(undefined)}
          error={error}
          header="Error"
          margin="medium"
          marginHorizontal="xxxxlarge"
        />
      )}
      <Wizard
        onClose={() => (inProgress ? setConfirmClose(true) : setOpen(false))}
        onComplete={completed => setInProgress(completed)}
        onSelect={onSelect}
        defaultSteps={defaultSteps}
        dependencySteps={steps}
        limit={5}
        loading={stepsLoading}
        onResetRef={onResetRef}
      >
        {{
          stepper: <WizardStepper />,
          navigation: <WizardNavigation onInstall={onInstall} />,
        }}
      </Wizard>
    </>
  )
}
