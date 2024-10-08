import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { Box, Text, TextInput, ThemeContext } from 'grommet'
import {
  Alert,
  AlertStatus,
  Button,
  GqlError,
  SecondaryButton,
} from 'forge-core'

import Toggle from 'react-toggle'

import { ModalHeader } from '../../../components/utils/Modal'
import { INSTALL_RECIPE, RECIPE_Q } from '../../../components/graphql/plural.js'

import { LabelledInput } from '../../../components/utils/LabelledInput'
import {
  appendConnection,
  deepFetch,
  updateCache,
} from '../../../utils/graphql'
import { BUILDS_Q } from '../../../components/graphql/builds.js'

import { trimSuffix } from '../../../utils/array'

import { LoginContext } from '../../../components/contexts'

import { Repository } from './SearchRepositories'
import { ConfigurationType, MODAL_WIDTH, OperationType } from './constants'
import { validateRegex } from './validation'

function ValidationMessage({ message }) {
  return (
    <Box
      direction="row"
      align="center"
      gap="xsmall"
    >
      <Text
        size="small"
        color="error"
      >
        {message}
      </Text>
    </Box>
  )
}

function StringConfiguration({
  config: { name, default: def, placeholder, documentation, validation },
  type,
  ctx,
  setValue,
}) {
  const value = ctx[name]

  useEffect(() => {
    if (!ctx[name] && def) {
      setValue(name, def)
    }
  }, [ctx, value, def])

  const msg = validation && validateRegex(value, validation)

  return (
    <Box
      flex={false}
      gap="xsmall"
    >
      {msg && <ValidationMessage message={msg} />}
      <LabelledInput
        width="100%"
        color="dark-2"
        weight={450}
        label={name}
        type={type}
        value={value || ''}
        placeholder={placeholder}
        onChange={(val) => setValue(name, val)}
      />
      <Text
        size="small"
        color="dark-6"
      >
        <i>{documentation}</i>
      </Text>
    </Box>
  )
}

function PasswordConfiguration({ config, ctx, setValue }) {
  return (
    <StringConfiguration
      config={config}
      ctx={ctx}
      setValue={setValue}
      type="password"
    />
  )
}

function BucketConfiguration({
  config: { name, default: def, placeholder, documentation },
  ctx,
  setValue,
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

  const format = useCallback(
    (val) => {
      if (prefix) return `${prefix}-${cluster}-${val}`

      return val
    },
    [prefix, cluster]
  )

  const trim = useCallback(
    (val) => val.replace(`${prefix}-${cluster}-`, ''),
    [prefix, cluster]
  )

  const [local, setLocal] = useState(trim(ctx[name] || def || ''))

  useEffect(() => {
    if (!ctx[name] && def) {
      setValue(name, format(ctx[name] || def))
    }
  }, [ctx, name, def])

  return (
    <Box
      flex={false}
      gap="xsmall"
    >
      <Text
        size="small"
        weight={500}
      >
        {name}
      </Text>
      <Box
        direction="row"
        align="center"
      >
        <Box
          flex={false}
          style={{ borderRightStyle: 'none' }}
          border={{ color: 'light-5' }}
          pad={{ horizontal: 'small' }}
          background="tone-light"
          height="37px"
          justify="center"
        >
          <Text
            size="small"
            weight={500}
          >
            {prefix}-{cluster}-
          </Text>
        </Box>
        <TextInput
          weight={450}
          value={local}
          placeholder={placeholder}
          onChange={({ target: { value } }) => {
            setValue(name, format(value))
            setLocal(value)
          }}
        />
      </Box>
      <Text
        size="small"
        color="dark-6"
      >
        <i>{documentation}</i>
      </Text>
    </Box>
  )
}

function DomainConfiguration({
  config: { name, default: def, placeholder, documentation },
  ctx,
  setValue,
}) {
  const { configuration } = useContext(LoginContext)
  const suffix = useMemo(() => {
    const subdomain = deepFetch(configuration, 'manifest.network.subdomain')

    return subdomain ? `.${subdomain}` : ''
  }, [configuration])

  const [local, setLocal] = useState(trimSuffix(ctx[name] || '', suffix))

  const suffixed = useCallback(
    (value) => `${trimSuffix(value, suffix)}${suffix}`,
    [suffix]
  )

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
      <Text
        size="small"
        weight={500}
      >
        {name}
      </Text>
      <Box
        direction="row"
        align="center"
      >
        <TextInput
          weight={450}
          value={local}
          placeholder={placeholder}
          onChange={({ target: { value } }) => {
            setValue(name, suffixed(value))
            setLocal(value)
          }}
        />
        <Box
          flex={false}
          style={{ borderLeftStyle: 'none' }}
          border={{ color: 'light-5' }}
          pad={{ horizontal: 'small' }}
          background="tone-light"
          height="37px"
          justify="center"
        >
          <Text
            size="small"
            weight={500}
          >
            {suffix}
          </Text>
        </Box>
      </Box>
      <Text
        size="small"
        color="dark-6"
      >
        <i>{documentation}</i>
      </Text>
    </Box>
  )
}

function IntConfiguration({
  config: { name, default: def, placeholder, documentation },
  ctx,
  setValue,
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
        modifier={
          err && (
            <Text
              size="small"
              color="error"
            >
              {err}
            </Text>
          )
        }
        onChange={(val) => {
          const parsed = parseInt(val)

          if (!parsed) {
            setErr(`${val} is not an integer`)
          } else {
            setErr(null)
            setValue(name, parsed)
          }
        }}
      />
      <Text
        size="small"
        color="dark-6"
      >
        <i>{documentation}</i>
      </Text>
    </Box>
  )
}

function BoolConfiguration({ config: { name, default: def }, ctx, setValue }) {
  const value = ctx[name]

  useEffect(() => {
    if (!ctx[name] && def) {
      setValue(name, def)
    }
  }, [ctx, def])

  return (
    <Box
      flex={false}
      direction="row"
      align="center"
      gap="xsmall"
    >
      <Toggle
        checked={value}
        onChange={({ target: { checked } }) => setValue(name, checked)}
      />
      <Text size="small">{name}</Text>
    </Box>
  )
}

function ConfigurationItem({ config, ctx, setValue }) {
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
        />
      )
    case ConfigurationType.DOMAIN:
      return (
        <DomainConfiguration
          config={config}
          ctx={ctx}
          setValue={setValue}
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
        />
      )
    default:
      return (
        <StringConfiguration
          config={config}
          ctx={ctx}
          setValue={setValue}
        />
      )
  }
}

function available(config, context) {
  if (!config.condition) return true

  const { condition } = config

  switch (condition.operation) {
    case OperationType.NOT:
      return !context[condition.field]
  }

  return true
}

function findIndex(ind, context, sections) {
  let nextInd = ind

  while (nextInd < sections.length - 1) {
    const ctx = context[sections[nextInd].repository.name]

    if (!ctx && sections[nextInd].configuration.length > 0) break
    const canConfigure = sections[nextInd].configuration.some(
      (conf) => !ctx[conf.name] && available(conf, ctx)
    )

    if (canConfigure) break
    nextInd++
  }

  return nextInd
}

function RecipeConfiguration({ recipe, context: ctx, setOpen }) {
  const sections = recipe.recipeSections
  const [oidc, setOidc] = useState(false)
  const [context, setContext] = useState(ctx)
  const [ind, setInd] = useState(findIndex(0, ctx, sections))
  const { repository } = sections[ind]
  const hasNext = sections.length > ind + 1
  const configuration = useMemo(
    () =>
      sections[ind].configuration.reduce(
        (acc, conf) => ({ ...acc, [conf.name]: conf }),
        {}
      ),
    [sections, ind]
  )

  const [mutation, { loading, error }] = useMutation(INSTALL_RECIPE, {
    variables: { id: recipe.id, oidc, context: JSON.stringify(context) },
    update: (cache, { data: { installRecipe } }) =>
      updateCache(cache, {
        query: BUILDS_Q,
        update: (prev) => appendConnection(prev, installRecipe, 'builds'),
      }),
    onCompleted: () => setOpen(false),
  })

  const setValue = useCallback(
    (name, val) =>
      setContext({
        ...context,
        [repository.name]: { ...(context[repository.name] || {}), [name]: val },
      }),
    [setContext, context, repository, ind]
  )

  useEffect(() => {
    if (!(repository.name in context))
      setContext({ ...context, [repository.name]: {} })
  }, [setContext, repository, context])

  const next = useCallback(() => {
    if (!hasNext) return mutation()
    const nextInd = findIndex(ind + 1, context, sections)

    setInd(nextInd)
  }, [ind, setInd, hasNext, mutation])

  return (
    <ThemeContext.Extend value={{ global: { input: { padding: '9px' } } }}>
      <Box
        fill
        gap="small"
        pad="small"
      >
        {error && (
          <Box pad="small">
            <GqlError
              error={error}
              header="Error installing bundle"
            />
          </Box>
        )}
        <Repository repo={repository} />
        <Box
          fill
          style={{ overflow: 'auto', maxHeight: '70vh' }}
        >
          <Box
            flex={false}
            gap="12px"
          >
            {Object.values(configuration)
              .filter((conf) => available(conf, context[repository.name] || {}))
              .map((conf) => (
                <ConfigurationItem
                  key={`${repository.name}-${conf.name}`}
                  config={conf}
                  setValue={setValue}
                  ctx={context[repository.name] || {}}
                />
              ))}
          </Box>
        </Box>
        <Box
          flex={false}
          direction="row"
          align="center"
          gap="small"
          justify="end"
        >
          {!hasNext && recipe.oidcEnabled && (
            <Box
              flex={false}
              direction="row"
              align="center"
              gap="xsmall"
            >
              <Toggle
                checked={oidc}
                onChange={({ target: { checked } }) => setOidc(checked)}
              />
              <Text size="small">
                {oidc ? 'oidc enabled' : 'oidc disabled'}
              </Text>
            </Box>
          )}
          {ind > 0 && (
            <SecondaryButton
              label="Previous"
              onClick={() => setInd(ind - 1)}
            />
          )}
          <Button
            label={hasNext ? 'Continue' : 'Install'}
            loading={loading}
            onClick={next}
          />
        </Box>
      </Box>
    </ThemeContext.Extend>
  )
}

const buildContext = (contexts) =>
  contexts.reduce(
    (acc, { repository, context }) => ({ ...acc, [repository]: context }),
    {}
  )

function RestrictedRecipe() {
  return (
    <Box pad="small">
      <Alert
        status={AlertStatus.ERROR}
        header="Cannot install recipe"
        description="This recipe has been marked restricted because it requires configuration, like ssh keys, that are only able to be securely configured locally"
      />
    </Box>
  )
}

export function Configuration({ recipe, setOpen }) {
  const { data } = useQuery(RECIPE_Q, {
    variables: { id: recipe.id },
    fetchPolicy: 'cache-and-network',
  })

  const { restricted } = recipe

  return (
    <Box
      animation="fadeIn"
      width={MODAL_WIDTH}
    >
      <ModalHeader
        text="Configure your installation"
        setOpen={setOpen}
      />
      <Box
        fill
        style={{ minHeight: '150px' }}
      >
        {restricted && <RestrictedRecipe />}
        {data && !restricted && (
          <RecipeConfiguration
            recipe={data.recipe}
            context={buildContext(data.context)}
            setOpen={setOpen}
          />
        )}
      </Box>
    </Box>
  )
}
