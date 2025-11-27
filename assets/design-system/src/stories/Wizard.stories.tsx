import { Button, Flex, P } from 'honorable'
import { type ReactElement, useEffect, useMemo, useState } from 'react'

import FormField from '../components/FormField'
import Input from '../components/Input'
import { type LayerPositionType } from '../components/Layer'
import Modal from '../components/Modal'
import { Toast } from '../components/Toast'
import AppsIcon from '../components/icons/AppsIcon'
import GlobeIcon from '../components/icons/GlobeIcon'
import InstallIcon from '../components/icons/InstallIcon'
import { useActive } from '../components/wizard'
import { Installer } from '../components/wizard/Installer'
import { Navigation } from '../components/wizard/Navigation'
import { Picker, type StepConfig } from '../components/wizard/Picker'
import { Step } from '../components/wizard/Step'
import { Stepper } from '../components/wizard/Stepper'
import { Wizard } from '../components/wizard/Wizard'

export default {
  title: 'Wizard',
  component: Wizard,
}

interface FormData {
  domain: string
}

function Application({ ...props }: any): ReactElement<any> {
  const { active, setData } = useActive<FormData>()
  const [domain, setDomain] = useState<string>(active?.data?.domain)

  // Build our form data
  const data = useMemo<FormData>(() => ({ domain }), [domain])

  // Update step data on change
  useEffect(() => setData(data), [domain, setData, data])

  return (
    <Step
      valid={domain?.length > 0}
      data={data}
      {...props}
    >
      <P
        overline
        color="text-xlight"
        paddingBottom="medium"
      >
        configure {active.label}
      </P>
      <FormField
        label="Domain"
        required
      >
        <Input
          placeholder="https://{domain}.onplural.sh"
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
        />
      </FormField>
    </Step>
  )
}

const PICKER_ITEMS: Array<StepConfig> = [
  {
    key: 'airflow',
    label: 'Airflow',
    imageUrl: '/logos/airflow-logo.svg',
    node: <Application key="airflow" />,
  },
  {
    key: 'airbyte',
    label: 'Airbyte',
    imageUrl: '/logos/airbyte-logo.svg',
    node: <Application key="airbyte" />,
  },
  {
    key: 'console',
    label: 'Console',
    imageUrl: '/logos/console-logo.png',
    node: <Application key="console" />,
  },
  {
    key: 'crossplane',
    label: 'Crossplane',
    imageUrl: '/logos/crossplane-logo.png',
    node: <Application key="crossplane" />,
  },
  {
    key: 'grafana',
    label: 'Grafana',
    Icon: GlobeIcon,
    node: <Application key="grafana" />,
  },
  {
    key: 'mongodb',
    label: 'MongoDB',
    Icon: GlobeIcon,
    node: <Application key="mongodb" />,
  },
  {
    key: 'datadog',
    label: 'Datadog',
    Icon: GlobeIcon,
    node: <Application key="datadog" />,
  },
]

const DEFAULT_STEPS: Array<StepConfig> = [
  {
    key: 'apps',
    label: 'Apps',
    Icon: AppsIcon,
    node: <Picker items={PICKER_ITEMS} />,
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
    node: <Installer />,
    isDefault: true,
  },
]

function ModalTemplate() {
  const [open, setOpen] = useState(true)
  const [confirmClose, setConfirmClose] = useState(false)
  const [visible, setVisible] = useState(false)
  const [inProgress, setInProgress] = useState<boolean>(false)

  return (
    <Flex>
      <Button onClick={() => setOpen(true)}>Open</Button>

      <Modal
        open={open}
        onClose={() => (inProgress ? setConfirmClose(true) : setOpen(false))}
        size="large"
      >
        <Wizard
          onClose={() => (inProgress ? setConfirmClose(true) : setOpen(false))}
          onComplete={(completed) => setInProgress(completed)}
          defaultSteps={DEFAULT_STEPS}
          limit={5}
        >
          {{
            stepper: <Stepper />,
            navigation: (
              <Navigation
                onInstall={() => {
                  setOpen(false)
                  setVisible(true)
                }}
              />
            ),
          }}
        </Wizard>
      </Modal>

      <Modal
        header="confirm cancellation"
        open={confirmClose}
        actions={
          <>
            <Button
              secondary
              onClick={() => setConfirmClose(false)}
            >
              Cancel
            </Button>
            <Button
              destructive
              marginLeft="medium"
              onClick={() => {
                setConfirmClose(false)
                setOpen(false)
              }}
            >
              Continue
            </Button>
          </>
        }
        style={{
          padding: 0,
        }}
      >
        <P>
          Are you sure you want to cancel installation? You will lose all
          progress.
        </P>
      </Modal>

      {visible && (
        <Toast
          position={'bottom-right' as LayerPositionType}
          onClose={() => setVisible(false)}
          margin="large"
          severity="success"
        >
          Successfully installed selected applications.
        </Toast>
      )}
    </Flex>
  )
}

function StandaloneTemplate() {
  const [visible, setVisible] = useState(false)

  return (
    <Flex
      width="100%"
      height="750px"
    >
      <Wizard defaultSteps={DEFAULT_STEPS}>
        {{
          stepper: <Stepper />,
          navigation: (
            <Navigation
              onInstall={() => {
                setVisible(true)
              }}
            />
          ),
        }}
      </Wizard>

      {visible && (
        <Toast
          position={'bottom-right' as LayerPositionType}
          onClose={() => setVisible(false)}
          margin="large"
          severity="success"
        >
          Successfully installed selected applications.
        </Toast>
      )}
    </Flex>
  )
}

export const Default = ModalTemplate.bind({})

Default.args = {}

export const Standalone = StandaloneTemplate.bind({})

Standalone.args = {}
