import { Box, Text } from 'grommet'

import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Switch } from 'honorable'
import { FormField, Input } from '@pluralsh/design-system'

import { validateRegex } from '../validation'
import { LabelledInput } from '../../utils/LabelledInput'
import { LoginContext } from '../../contexts'
import { deepFetch } from '../../../utils/graphql'
import { trimSuffix } from '../../../utils/array'
import { ConfigurationType } from '../constants'

function StringConfiguration({
  config: {
    name, default: def, placeholder, documentation, validation,
  }, type, ctx, setValue, setValid,
}) {
  const value = ctx[name]

  useEffect(() => {
    if (!ctx[name] && def) {
      setValue(name, def)
    }
  }, [ctx, value, def, name, setValue])

  const msg = validation && validateRegex(value, validation)

  useEffect(() => (setValid ? msg ? setValid(false) : setValid(true) : undefined), [msg, setValid])

  return (
    <FormField
      label={name}
      hint={msg || documentation}
      error={!!msg}
    >
      <Input
        placeholder={placeholder}
        value={value}
        type={type}
        error={!!msg}
        onChange={({ target: { value } }) => setValue(name, value)}
      />
    </FormField>
  )
}

function PasswordConfiguration({
  config, ctx, setValue, setValid,
}) {
  return (
    <StringConfiguration
      config={config}
      ctx={ctx}
      setValue={setValue}
      setValid={setValid}
      type="password"
    />
  )
}

function BucketConfiguration({
  config: {
    name, default: def, placeholder, documentation,
  }, ctx, setValue,
}) {
  const { configuration } = useContext(LoginContext)
  const { prefix, cluster } = useMemo(() => {
    const prefix = deepFetch(configuration, 'manifest.bucketPrefix')
    const cluster = deepFetch(configuration, 'manifest.cluster')

    if (prefix && prefix !== '') {
      return { prefix, cluster }
    }

    return {}
  }, [configuration])

  const format = useCallback(val => {
    if (prefix) return `${prefix}-${cluster}-${val}`

    return val
  }, [prefix, cluster])

  const trim = useCallback(val => val.replace(`${prefix}-${cluster}-`, ''), [prefix, cluster])

  const [local, setLocal] = useState(trim(ctx[name] || def || ''))

  useEffect(() => {
    if (!ctx[name] && def) {
      setValue(name, format(ctx[name] || def))
    }
  }, [ctx, name, def, setValue, format])

  return (
    <FormField
      hint={documentation}
      label={name}
    >
      <Input
        onChange={({ target: { value } }) => {
          setLocal(value)
          setValue(name, format(value))
        }}
        prefix={prefix}
        placeholder={placeholder}
        value={local}
      />
    </FormField>
  )
}

function DomainConfiguration({
  config: {
    name, default: def, placeholder, documentation,
  }, ctx, setValue,
}) {
  const { configuration } = useContext(LoginContext)
  const suffix = useMemo(() => {
    const subdomain = deepFetch(configuration, 'manifest.network.subdomain')

    return subdomain ? `.${subdomain}` : ''
  }, [configuration])

  const [local, setLocal] = useState(trimSuffix(ctx[name] || '', suffix))
  const suffixed = useCallback(value => `${trimSuffix(value, suffix)}${suffix}`, [suffix])

  useEffect(() => {
    if (!ctx[name] && def) {
      setValue(name, def)
    }
  }, [name, ctx, def, setValue])

  return (
    <FormField
      hint={documentation}
      label={name}
    >
      <Input
        onChange={({ target: { value } }) => {
          setLocal(value)
          setValue(name, suffixed(value))
        }}
        suffix={suffix}
        placeholder={placeholder}
        value={local}
      />
    </FormField>
  )
}

function IntConfiguration({
  config: {
    name, default: def, placeholder, documentation,
  }, ctx, setValue,
}) {
  const value = ctx[name]
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (!ctx[name] && def) {
      setValue(name, def)
    }
  }, [name, ctx, def])

  return (
    <Box
      flex={false}
      gap="xsmall"
    >
      <LabelledInput
        width="100%"
        color="dark-1"
        weight={450}
        label={name}
        value={value || ''}
        placeholder={placeholder}
        modifier={err && (
          <Text
            size="small"
            color="error"
          >{err}
          </Text>
        )}
        onChange={val => {
          const parsed = parseInt(val)

          if (!parsed) {
            setErr(`${val} is not an integer`)
          }
          else {
            setErr(null)
            setValue(name, parsed)
          }
        }}
      />
      <Text
        size="small"
        color="dark-6"
      ><i>{documentation}</i>
      </Text>
    </Box>
  )
}

function BoolConfiguration({ config: { name, default: def }, ctx, setValue }) {
  const value: boolean = ctx[name]

  useEffect(() => {
    if (!ctx[name] && def) {
      setValue(name, def)
    }
  }, [ctx, def, name, setValue])

  return (
    <Box
      flex={false}
      direction="row"
      align="center"
      gap="xsmall"
    >
      <Switch
        checked={value}
        onChange={({ target: { checked } }) => setValue(name, checked)}
      />
      <Text size="small">{name}</Text>
    </Box>
  )
}

export function ConfigurationItem({
  config, ctx, setValue, setValid,
}) {
  switch (config.type) {
  case ConfigurationType.BOOL:
    return (
      <BoolConfiguration
        config={config}
        ctx={ctx}
        setValue={setValue}
        setValid={setValid}
      />
    )
  case ConfigurationType.INT:
    return (
      <IntConfiguration
        config={config}
        ctx={ctx}
        setValue={setValue}
        setValid={setValid}
      />
    )
  case ConfigurationType.DOMAIN:
    return (
      <DomainConfiguration
        config={config}
        ctx={ctx}
        setValue={setValue}
        setValid={setValid}
      />
    )
  case ConfigurationType.BUCKET:
    return (
      <BucketConfiguration
        config={config}
        ctx={ctx}
        setValue={setValue}
        setValid={setValid}
      />
    )
  case ConfigurationType.PASSWORD:
    return (
      <PasswordConfiguration
        config={config}
        ctx={ctx}
        setValue={setValue}
        setValid={setValid}
      />
    )
  default:
    return (
      <StringConfiguration
        config={config}
        ctx={ctx}
        setValue={setValue}
        setValid={setValid}
      />
    )
  }
}
