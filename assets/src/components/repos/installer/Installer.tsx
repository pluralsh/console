import { useContext, useMemo, useState } from 'react'
import {
  AppsIcon,
  InstallIcon,
  LoopingLogo,
  Wizard,
  WizardInstaller,
  WizardNavigation,
  WizardPicker,
  WizardStepConfig,
  WizardStepper,
} from '@pluralsh/design-system'
import { Box } from 'grommet'
import { useQuery } from 'react-apollo'

import { SEARCH_REPOS } from '../../graphql/plural'
import { InstallationContext } from '../../Installations'

import { Application } from './Application'

const toPickerItems = (applications): Array<WizardStepConfig> => applications.map(app => ({
  key: app.id,
  label: app.name,
  imageUrl: app.icon,
  node: <Application key={app.id} />,
}))

const toSteps = (applications): Array<WizardStepConfig> => [{
  key: 'apps',
  label: 'Apps',
  Icon: AppsIcon,
  node: <WizardPicker items={toPickerItems(applications)} />,
  isDefault: true,
},
{
  key: 'placeholder',
  isPlaceholder: true,
},
{
  key: 'install',
  label: 'Install',
  Icon: InstallIcon,
  node: <WizardInstaller />,
  isDefault: true,
}]

export function Installer({ setOpen, setConfirmClose, setVisible }) {
  const [inProgress, setInProgress] = useState<boolean>(false)
  const { applications: installedApplications } = useContext(InstallationContext)
  const { data: { repositories: { edges: applicationNodes } = {} } = {}, loading } = useQuery(SEARCH_REPOS, {
    variables: { query: '' },
    fetchPolicy: 'cache-and-network',
  })

  const applications = applicationNodes?.map(({ node }) => node)
  // Not the most efficient solution O(n*m) but simple and clean.
  const installableApplications = useMemo(() => applications?.filter(app => !installedApplications?.find(s => s.name === app.name)),
    [applications, installedApplications])

  if (loading) {
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
    <Wizard
      onClose={() => (inProgress ? setConfirmClose(true) : setOpen(false))}
      onComplete={(stepCompleted, completed) => setInProgress(stepCompleted || completed)}
      steps={toSteps(installableApplications)}
      limit={5}
    >
      {{
        stepper: <WizardStepper />,
        navigation: <WizardNavigation onInstall={() => {
          setOpen(false)
          setVisible(true)
        }}
        />,
      }}
    </Wizard>
  )
}
