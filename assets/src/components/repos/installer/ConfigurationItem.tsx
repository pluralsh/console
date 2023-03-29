import { useContext, useEffect, useMemo, useState } from 'react'
import { Switch } from 'honorable'
import { FormField, Input } from '@pluralsh/design-system'
import StartCase from 'lodash/startCase'

import { LoginContext } from '../../contexts'
import { deepFetch } from '../../../utils/graphql'
import { ConfigurationType } from '../constants'

import ConfigurationFileInput from './ConfigurationFileInput'

type ModifierFunction = (value: string, trim?: boolean) => string

const modifierFactory = (
  type: ConfigurationType,
  configuration
): ModifierFunction => {
  switch (type) {
    case ConfigurationType.STRING:
    case ConfigurationType.INT:
    case ConfigurationType.PASSWORD:
      return stringModifier
    case ConfigurationType.BUCKET:
      return bucketModifier.bind({ configuration })
    case ConfigurationType.DOMAIN:
      return domainModifier.bind({ configuration })
  }

  return stringModifier
}

const stringModifier = (value) => value

function bucketModifier(this: { configuration }, value: string, trim = false) {
  const { configuration } = this
  const bucketPrefix = deepFetch(configuration, 'manifest.bucketPrefix')
  const cluster = deepFetch(configuration, 'manifest.cluster')
  const prefix = `${bucketPrefix}-${cluster}-`

  if (trim) return value?.replace(prefix, '')

  return bucketPrefix && cluster ? `${prefix}${value}` : value
}
function domainModifier(this: { configuration }, value: string, trim = false) {
  const { configuration } = this
  const subdomain = deepFetch(configuration, 'manifest.network.subdomain') || ''
  const suffix = subdomain ? `.${subdomain}` : ''

  if (trim) return value?.replace(suffix, '')

  return subdomain ? `${value}${suffix}` : value
}

const createValidator =
  (regex: RegExp, optional: boolean, error: string) =>
  (value): { valid: boolean; message: string } => ({
    valid: value ? regex.test(value) : optional,
    message: error,
  })

function ConfigurationField({ config, ctx, setValue }) {
  const {
    name,
    default: defaultValue,
    placeholder,
    documentation,
    validation,
    optional,
    type,
  } = config
  const { configuration } = useContext(LoginContext)

  const value = useMemo(() => ctx[name]?.value, [ctx, name])
  const validator = useMemo(
    () =>
      createValidator(
        new RegExp(validation?.regex ? `^${validation?.regex}$` : /.*/),
        optional,
        validation?.message
      ),
    [optional, validation?.message, validation?.regex]
  )
  const { valid, message } = useMemo(() => validator(value), [validator, value])
  const modifier = useMemo(
    () => modifierFactory(config.type, configuration),
    [config.type, configuration]
  )

  const [local, setLocal] = useState(modifier(value, true) || defaultValue)

  useEffect(
    () =>
      local
        ? setValue(name, modifier(local), valid)
        : setValue(name, local, valid),
    [local, setValue, modifier, name, valid, config]
  )

  const isInt = type === ConfigurationType.INT
  const isPassword =
    type === ConfigurationType.PASSWORD ||
    ['private_key', 'public_key'].includes(config.name)
  const isFile = type === ConfigurationType.FILE

  const inputFieldType = isInt ? 'number' : isPassword ? 'password' : 'text'

  return (
    <FormField
      label={StartCase(name)}
      hint={message || documentation}
      error={!valid}
      required={!optional}
    >
      {isFile ? (
        <ConfigurationFileInput
          value={local ?? ''}
          onChange={(val) => {
            setLocal(val?.text ?? '')
          }}
        />
      ) : (
        <Input
          placeholder={placeholder}
          value={local}
          type={inputFieldType}
          error={!valid}
          prefix={
            config.type === ConfigurationType.BUCKET
              ? `${deepFetch(configuration, 'manifest.bucketPrefix')}-`
              : ''
          }
          suffix={
            config.type === ConfigurationType.DOMAIN
              ? `.${deepFetch(configuration, 'manifest.network.subdomain')}`
              : ''
          }
          onChange={({ target: { value } }) => setLocal(value)}
        />
      )}
    </FormField>
  )
}

function BoolConfiguration({ config: { name, default: def }, ctx, setValue }) {
  const value: boolean = `${ctx[name]?.value}`.toLowerCase() === 'true'

  useEffect(() => {
    if (value === undefined && def) setValue(name, def)
  }, [value, def, name, setValue])

  return (
    <Switch
      checked={value}
      onChange={({ target: { checked } }) => setValue(name, checked)}
    >
      {StartCase(name)}
    </Switch>
  )
}

export function ConfigurationItem({ config, ctx, setValue }) {
  switch (config.type) {
    case ConfigurationType.BOOL:
      return (
        <BoolConfiguration
          config={config}
          ctx={ctx}
          setValue={setValue}
        />
      )
    default:
      return (
        <ConfigurationField
          config={config}
          ctx={ctx}
          setValue={setValue}
        />
      )
  }
}
