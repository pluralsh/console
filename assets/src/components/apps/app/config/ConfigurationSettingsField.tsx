import { createElement, useCallback, useEffect } from 'react'

import {
  FormField,
  Input,
  ListBoxItem,
  Select,
} from '@pluralsh/design-system'

import { Flex } from 'honorable'

import { deepFetch } from '../../../../utils/graphql'

import { convertType } from '../runbooks/runbook/display/misc'

function ConfigurationSettingsInput({ value = '', setValue }) {
  return (
    <Input
      value={value}
      onChange={setValue}
    />
  )
}

// TODO: Test it as there are no apps with enum configOverlays in the system now.
function ConfigurationSettingsSelect({ overlay: { spec: { inputValues } }, value, setValue }) {
  return (
    <Select
      selectedKey={value}
      onSelectionChange={setValue}
    >
      {inputValues?.map(v => (
        <ListBoxItem
          key={v}
          label={v}
          textValue={v}
        />
      ))}
    </Select>
  )
}

const INPUT_COMPONENTS = {
  enum: ConfigurationSettingsSelect,
}

export default function ConfigurationSettingsField({
  overlay, ctx, setCtx, values, ...props
}) {
  const {
    name, documentation, updates, inputType,
  } = overlay.spec
  const setValue = useCallback(val => setCtx({ ...ctx, [name]: convertType(val, inputType) }), [name, inputType, ctx, setCtx])

  useEffect(() => {
    const val = deepFetch(values, updates[0].path)

    if (val && !ctx[name]) setValue(val)
  }, [name, updates, values, setValue, ctx])

  const component = INPUT_COMPONENTS[inputType] || ConfigurationSettingsInput

  return (
    <Flex {...props}>
      <FormField
        label={overlay.spec.name}
        hint={documentation}
        width="100%"
      >
        {createElement(component, { overlay, setValue, value: ctx[name] })}
      </FormField>
    </Flex>
  )
}
