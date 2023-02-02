import { Box } from 'grommet'
import { Div, Flex, P } from 'honorable'
import {
  BriefcaseIcon,
  Button,
  PeopleIcon,
  Stepper,
  ValidatedInput,
} from '@pluralsh/design-system'
import { useState } from 'react'
import { StepperSteps } from '@pluralsh/design-system/dist/components/Stepper'

import { GqlError } from '../../utils/Alert'

import RoleFormGeneralAttributes from './RoleFormGeneralAttributes'
import RolePermissionToggle from './RolePermissionToggle'

const stepBase = {
  circleSize: 32,
  iconSize: 16,
  vertical: true,
}

const steps: StepperSteps = [
  {
    key: 'create-repo',
    stepTitle: <Div marginRight="small">Role info</Div>,
    IconComponent: BriefcaseIcon,
    ...stepBase,
  },
  {
    key: 'choose-cloud',
    stepTitle: <Div marginRight="small">Bindings </Div>,
    IconComponent: PeopleIcon,
    ...stepBase,
  },
]

const PermissionTypes = {
  READ: 'Can view components',
  CONFIGURE: 'Can edit helm/terraform configuration',
  DEPLOY: 'Can create/approve deployments',
  OPERATE: 'Can delete pods, export logs, and other operational tasks',
}

export default function RoleForm({
  cancel,
  submit,
  loading,
  error,
  attributes,
  setAttributes,
  bindings,
  setBindings,
}): any {
  const [step, setStep] = useState<0|1>(0)
  const permissions = Object.entries(PermissionTypes)
  const len = permissions.length

  return (
    <Box
      flex={false}
      gap="small"
    >
      <Flex
        align="center"
        justify="space-between"
      >
        <Stepper
          compact
          steps={steps}
          stepIndex={step}
        />
      </Flex>
      {error && (
        <GqlError
          header="Something went wrong"
          error={error}
        />
      )}

      {/* ROLE INFO */}
      {step === 0 && (
        <Box gap="small">
          <Box>
            <ValidatedInput
              label="Name"
              value={attributes.name}
              onChange={({ target: { value } }) => setAttributes({ ...attributes, name: value })}
            />
            <ValidatedInput
              label="Description"
              value={attributes.description}
              onChange={({ target: { value } }) => setAttributes({ ...attributes, description: value })}
            />
            <P
              body1
              fontWeight={600}
            >
              Permissions
            </P>
            {permissions.map(([perm, description], i) => (
              <RolePermissionToggle
                key={perm}
                permission={perm}
                description={description}
                attributes={attributes}
                setAttributes={setAttributes}
                last={i === len - 1}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* BINDINGS */}
      {step === 1 && (
        <RoleFormGeneralAttributes
          attributes={attributes}
          setAttributes={setAttributes}
          bindings={bindings}
          setBindings={setBindings}
        />
      )}

      <Flex gap="medium">
        <Button
          secondary
          onClick={cancel}
        >
          Cancel
        </Button>
        <Button
          onClick={() => setStep(1)}
          loading={loading}
        >
          Next
        </Button>

        <Button
          secondary
          onClick={() => setStep(0)}
        >
          Back
        </Button>
        <Button
          onClick={submit}
          loading={loading}
        >
          Create
        </Button>
      </Flex>
    </Box>
  )
}
