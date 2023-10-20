import {
  BriefcaseIcon,
  Button,
  PeopleIcon,
  Stepper,
  ValidatedInput,
} from '@pluralsh/design-system'
import { ComponentProps, useState } from 'react'
import styled, { useTheme } from 'styled-components'

import { GqlError } from '../../utils/Alert'

import RoleFormBindings from './RoleFormBindings'
import RolePermissionToggle from './RolePermissionToggle'

const stepBase = {
  circleSize: 32,
  iconSize: 16,
  vertical: true,
}

const StepTitle = styled.div(({ theme }) => ({
  marginRight: theme.spacing.small,
}))

const steps: ComponentProps<typeof Stepper>['steps'] = [
  {
    key: 'create-repo',
    stepTitle: <StepTitle>Role info</StepTitle>,
    IconComponent: BriefcaseIcon,
    ...stepBase,
  },
  {
    key: 'choose-cloud',
    stepTitle: <StepTitle>Bindings</StepTitle>,
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
  const theme = useTheme()
  const [step, setStep] = useState<0 | 1>(0)
  const permissions = Object.entries(PermissionTypes)
  const len = permissions.length

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.large,
      }}
    >
      <div css={{ display: 'flex' }}>
        <Stepper
          compact
          steps={steps}
          stepIndex={step}
        />
      </div>

      {/* Role info */}
      {step === 0 && (
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.large,
          }}
        >
          <section
            css={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.medium,
            }}
          >
            <ValidatedInput
              label="Name"
              placeholder="Role name"
              value={attributes.name}
              onChange={({ target: { value } }) =>
                setAttributes({ ...attributes, name: value })
              }
            />
            <ValidatedInput
              label="Description"
              placeholder="Role description"
              value={attributes.description}
              onChange={({ target: { value } }) =>
                setAttributes({ ...attributes, description: value })
              }
            />
          </section>
          <section>
            <h3
              css={{
                margin: 0,
                padding: 0,
                ...theme.partials.text.body1Bold,
                borderTop: theme.borders.default,
                paddingTop: theme.spacing.large,
              }}
            >
              Permissions
            </h3>
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
        </div>
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

      <div
        css={{
          display: 'flex',
          gap: theme.spacing.medium,
          justifyContent: 'end',
        }}
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
      </div>
    </div>
  )
}
