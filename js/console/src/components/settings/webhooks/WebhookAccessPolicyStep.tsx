import { Divider, Flex, FormField } from '@pluralsh/design-system'
import { FormBindings } from 'components/utils/bindings'
import { PolicyBindingFragment } from 'generated/graphql'

export function WebhookAccessPolicyStep({
  readBindings,
  writeBindings,
  onReadBindingsChange,
  onWriteBindingsChange,
}: {
  readBindings: PolicyBindingFragment[]
  writeBindings: PolicyBindingFragment[]
  onReadBindingsChange: (next: PolicyBindingFragment[]) => void
  onWriteBindingsChange: (next: PolicyBindingFragment[]) => void
}) {
  return (
    <Flex
      direction="column"
      gap="large"
    >
      <Flex
        direction="column"
        gap="xsmall"
      >
        <FormField label="Read permissions">
          <FormBindings
            bindings={readBindings}
            setBindings={onReadBindingsChange}
            hints={{
              user: 'Users with read permissions for this webhook',
              group: 'Groups with read permissions for this webhook',
            }}
          />
        </FormField>
      </Flex>
      <Divider backgroundColor="border" />
      <Flex
        direction="column"
        gap="xsmall"
      >
        <FormField label="Write permissions">
          <FormBindings
            bindings={writeBindings}
            setBindings={onWriteBindingsChange}
            hints={{
              user: 'Users with write permissions for this webhook',
              group: 'Groups with write permissions for this webhook',
            }}
          />
        </FormField>
      </Flex>
    </Flex>
  )
}
