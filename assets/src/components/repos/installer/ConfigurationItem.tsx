import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Switch } from 'honorable'
import { FormField, Input } from '@pluralsh/design-system'
import StartCase from 'lodash/startCase'

import { validateRegex } from '../validation'
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
  const msg = validation && validateRegex(value, validation)

  useEffect(() => {
    if (value === undefined && def) {
      setValue(name, def)
    }
  }, [ctx, value, def, name, setValue])

  useEffect(() => (setValid ? msg ? setValid(false) : setValid(true) : undefined), [msg, setValid])

  return (
    <FormField
      label={StartCase(name)}
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

  const [local, setLocal] = useState<string>(trim(ctx[name] || def || ''))

  useEffect(() => {
    if (!ctx[name] && def) {
      setValue(name, format(ctx[name] || def))
    }
  }, [ctx, name, def, setValue, format])

  return (
    <FormField
      hint={documentation}
      label={StartCase(name)}
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
  }, ctx, setValue, setValid,
}) {
  // Support for lookahead operator in Safari was just added but it's not released yet.
  // /^(((?!-)[A-Za-z0-9-]{1,63}(?<!-)\.)+[A-Za-z]{2,253})$/ is replaced for now.
  // See: https://github.com/WebKit/WebKit/pull/7109
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const domainRegex = /^(?!-)(?:(?:[a-zA-Z\d][a-zA-Z\d-]{0,61})?[a-zA-Z\d]\.){1,126}(?!\d+)[a-zA-Z\d]{1,63}$/
  const { configuration } = useContext(LoginContext)
  const suffix = useMemo(() => {
    const subdomain = deepFetch(configuration, 'manifest.network.subdomain')

    return subdomain ? `.${subdomain}` : ''
  }, [configuration])

  const [local, setLocal] = useState(trimSuffix(ctx[name] || '', suffix))
  const suffixed = useCallback(value => `${trimSuffix(value, suffix)}${suffix}`, [suffix])
  const valid = useMemo(() => domainRegex.test(ctx[name]), [domainRegex, ctx, name])

  useEffect(() => setValid(valid), [setValid, valid])

  useEffect(() => {
    if (ctx[name] === undefined && def) {
      setValue(name, def)
    }
  }, [name, ctx, def, setValue])

  return (
    <FormField
      hint={valid ? documentation : 'Provide a valid domain name'}
      label={StartCase(name)}
      error={!valid}
      required
    >
      <Input
        onChange={({ target: { value } }) => {
          setLocal(value)
          setValue(name, suffixed(value))
        }}
        suffix={suffix}
        placeholder={placeholder}
        error={!valid}
        value={local}
      />
    </FormField>
  )
}

function IntConfiguration({
  config, ctx, setValue, setValid,
}) {
  return (
    <StringConfiguration
      config={config}
      ctx={ctx}
      setValue={setValue}
      setValid={setValid}
      type="number"
    />
  )
}

function BoolConfiguration({
  config: { name, default: def }, ctx, setValue,
}) {
  const value: boolean = ctx[name]

  useEffect(() => {
    if (ctx[name] === undefined && def) {
      setValue(name, def)
    }
  }, [ctx, def, name, setValue])

  return (
    <Switch
      checked={value}
      onChange={({ target: { checked } }) => setValue(name, checked)}
    >
      {StartCase(name)}
    </Switch>
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
        type={undefined}
      />
    )
  }
}
