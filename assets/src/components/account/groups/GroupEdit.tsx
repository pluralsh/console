import { useApolloClient, useMutation } from '@apollo/client'
import {
  Button,
  ComboBox,
  FormField,
  Modal,
  PeopleIcon,
  PersonPlusIcon,
  Stepper,
  ValidatedInput,
} from '@pluralsh/design-system'
import { useEffect, useState } from 'react'
import { Div, Flex } from 'honorable'

import { fetchUsers } from 'components/utils/BindingInput'

import { StepperSteps } from '@pluralsh/design-system/dist/components/Stepper'

import { GqlError } from '../../utils/Alert'

import { CREATE_GROUP_MEMBERS, GROUP_MEMBERS, UPDATE_GROUP } from './queries'

import GroupMembers from './GroupMembers'

const stepBase = {
  circleSize: 32,
  iconSize: 16,
  vertical: true,
}

const steps: StepperSteps = [
  {
    key: 'info',
    stepTitle: <Div marginRight="small">Group info</Div>,
    IconComponent: PeopleIcon,
    ...stepBase,
  },
  {
    key: 'bindings',
    stepTitle: <Div marginRight="small">User bindings</Div>,
    IconComponent: PersonPlusIcon,
    ...stepBase,
  },
]

export default function GroupEdit({ group, edit, setEdit }: any) {
  const client = useApolloClient()
  const [value, setValue] = useState('')
  const [name, setName] = useState(group.name)
  const [description, setDescription] = useState(group.description)
  const [mutation, { loading, error }] = useMutation(UPDATE_GROUP, {
    variables: { id: group.id, attributes: { name, description } },
    onCompleted: () => setEdit(false),
  })
  const [addMut] = useMutation(CREATE_GROUP_MEMBERS, {
    variables: { groupId: group.id },
    refetchQueries: [{ query: GROUP_MEMBERS, variables: { id: group.id } }],
  })
  const [suggestions, setSuggestions] = useState([])
  const [step, setStep] = useState<0|1>(0)

  // Run only on first render. Make sure there will be data in Combo Box to start with.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => fetchUsers(client, value, setSuggestions), [])

  useEffect(() => {
    setName(group.name)
    setDescription(group.description)
  }, [group])

  return (
    <Modal
      portal
      open={edit}
      size="large"
      onClose={() => setEdit(false)}
    >
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

        {/* Group info */}
        {step === 0 && (
          <Flex
            flexDirection="column"
            gap="large"
          >
            <ValidatedInput
              label="Name"
              value={name}
              onChange={({ target: { value } }) => setName(value)}
            />
            <ValidatedInput
              label="Description"
              value={description}
              onChange={({ target: { value } }) => setDescription(value)}
            />
          </Flex>
        )}

        {/* Bindings */}
        {step === 1 && (
          <Flex
            flexDirection="column"
            gap="large"
          >
            <FormField
              label="Add users"
              width="100%"
              {...{
                '& :last-child': {
                  marginTop: 0,
                },
              }}
            >
              <ComboBox
                inputValue={value}
                  // @ts-expect-error
                placeholder="Search a user"
                onSelectionChange={key => {
                  setValue('')
                    // @ts-expect-error
                  addMut({ variables: { userId: key } })
                }}
                onInputChange={value => {
                  setValue(value)
                  fetchUsers(client, value, setSuggestions)
                }}
              >
                {suggestions.map(({ label }) => label)}
              </ComboBox>
            </FormField>
            <GroupMembers
              group={group}
              edit
            />
          </Flex>
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
                onClick={() => setEdit(false)}
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
                onClick={() => mutation()}
                loading={loading}
              >
                Update
              </Button>
            </>
          )}
        </Flex>
      </Flex>
    </Modal>
  )
}
