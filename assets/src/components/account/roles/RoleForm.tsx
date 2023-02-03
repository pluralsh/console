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

import RoleFormBindings from './RoleFormBindings'
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
  label = 'Create',
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
    <Flex
      direction="column"
      gap="medium"
    >
      <Flex>
        <Stepper
          compact
          steps={steps}
          stepIndex={step}
        />
      </Flex>

      {/* Role info */}
      {step === 0 && (
        <Flex
          direction="column"
          gap="small"
        >
          <ValidatedInput
            label="Name"
            placeholder="Role name"
            value={attributes.name}
            onChange={({ target: { value } }) => setAttributes({ ...attributes, name: value })}
          />
          <ValidatedInput
            label="Description"
            placeholder="Role description"
            value={attributes.description}
            onChange={({ target: { value } }) => setAttributes({ ...attributes, description: value })}
          />
          <P
            body1
            borderTop="1px solid border"
            fontWeight={600}
            paddingTop="large"
          >
            Permissions
          </P>
          <section>
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
          </section>
        </Flex>
      )}

      {/* Bindings */}
      {step === 1 && (
        <RoleFormBindings
          attributes={attributes}
          setAttributes={setAttributes}
          bindings={bindings}
          setBindings={setBindings}
        />
      )}

      {error && (
        <GqlError
          header="Something went wrong"
          error={error}
        />
      )}

      <Flex
        gap="medium"
        justify="end"
      >
        {step === 0 && (
          <>
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
          </>
        )}

        {step === 1 && (
          <>
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
              {label}
            </Button>
          </>
        )}
      </Flex>
    </Flex>
  )
}
