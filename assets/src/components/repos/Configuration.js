import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from 'react-apollo'
import { Box, Text, TextInput, ThemeContext } from 'grommet'
import { Button, SecondaryButton, GqlError } from 'forge-core'
import { ModalHeader } from '../utils/Modal'
import { INSTALL_RECIPE, RECIPE_Q } from '../graphql/plural'
import { ConfigurationType, MODAL_WIDTH, OperationType } from './constants'
import { Repository } from './SearchRepositories'
import { LabelledInput } from '../utils/LabelledInput'
import { appendConnection, updateCache } from '../../utils/graphql'
import { BUILDS_Q } from '../graphql/builds'
import { LoginContext } from '../Login'
import { trimSuffix } from '../../utils/array'
import { deepFetch } from '../../utils/graphql'
import Toggle from 'react-toggle'

function StringConfiguration({config: {name, default: def, placeholder, documentation}, ctx, setValue}) {
  const value = ctx[name]
  useEffect(() => {
    if (!value && def) {
      setValue(name, def)
    }
  }, [name, value, def])

  return (
    <Box flex={false} gap='xsmall'>
      <LabelledInput
        width='100%'
        color='dark-2'
        weight={450}
        label={name}
        value={value || ''}
        placeholder={placeholder}
        onChange={(val) => setValue(name, val)} />
      <Text size='small' color='dark-6'><i>{documentation}</i></Text>
    </Box>
  )
}

function BucketConfiguration({config: {name, default: def, placeholder, documentation}, ctx, setValue}) {
  const {configuration} = useContext(LoginContext)
  const {prefix, cluster} = useMemo(() => {
    const prefix = deepFetch(configuration, 'manifest.bucketPrefix')
    const cluster = deepFetch(configuration, 'manifest.cluster')
    if (prefix && prefix !== '') {
      return {prefix, cluster}
    }
  
    return {}
  }, [configuration])

  const format = useCallback((val) => {
    if (prefix) return `${prefix}-${cluster}-${val}`
    return val
  }, [prefix, cluster])

  const trim = useCallback((val) => val.replace(`${prefix}-${cluster}-`, ''), [prefix, cluster])

  const [local, setLocal] = useState(trim(ctx[name] || def))
  
  useEffect(() => {
    if (ctx[name] || def) {
      setValue(name, format(ctx[name] || def))
    }
  }, [name, def])

  return (
    <Box flex={false} gap='xsmall'>
      <Text size='small' weight={500}>{name}</Text>
      <Box direction='row' align='center'>
        <Box flex={false} style={{borderRightStyle: 'none'}} border={{color: 'light-5'}} pad={{horizontal: 'small'}} 
             background='tone-light' height='37px' justify='center'>
          <Text size='small' weight={500}>{prefix}-{cluster}-</Text>
        </Box>
        <TextInput
          weight={450}
          value={local}
          placeholder={placeholder}
          onChange={({target: {value}}) => {
            setValue(name, format(value))
            setLocal(value)
          }} />
      </Box>
      <Text size='small' color='dark-6'><i>{documentation}</i></Text>
    </Box>
  )
}

function DomainConfiguration({config: {name, default: def, placeholder, documentation}, ctx, setValue}) {
  const {configuration} = useContext(LoginContext)
  const suffix = useMemo(() => {
    const subdomain = deepFetch(configuration, 'manifest.network.subdomain')
    return subdomain ? "." + subdomain : '' 
  }, [configuration])

  const [local, setLocal] = useState(trimSuffix(ctx[name] || '', suffix))

  const suffixed = useCallback((value) => {
    return `${trimSuffix(value, suffix)}${suffix}`
  }, [suffix])
  
  useEffect(() => {
    if (!local && def) {
      setValue(name, def)
    }
  }, [name, local, def])

  return (
    <Box flex={false} gap='xsmall'>
      <Text size='small' weight={500}>{name}</Text>
      <Box direction='row' align='center'>
        <TextInput
          weight={450}
          value={local}
          placeholder={placeholder}
          onChange={({target: {value}}) => {
            setValue(name, suffixed(value))
            setLocal(value)
          }} />
        <Box style={{borderLeftStyle: 'none'}} border={{color: 'light-5'}} pad={{horizontal: 'small'}} 
             background='tone-light' height='37px' justify='center'>
          <Text size='small' weight={500}>{suffix}</Text>
        </Box>
      </Box>
      
      <Text size='small' color='dark-6'><i>{documentation}</i></Text>
    </Box>
  )
}

function IntConfiguration({config: {name, default: def, placeholder, documentation}, ctx, setValue}) {
  const value = ctx[name]
  const [err, setErr] = useState(null)
  useEffect(() => {
    if (!value && def) {
      setValue(name, def)
    }
  }, [name, value, def])

  return (
    <Box flex={false} gap='xsmall'>
      <LabelledInput
        width='100%'
        color='dark-1'
        weight={450}
        label={name}
        value={value || ''}
        placeholder={placeholder}
        modifier={err && <Text size='small' color='error'>{err}</Text>}
        onChange={(val) => {
          const parsed = parseInt(val)
          if (!parsed) {
            setErr(`${val} is not an integer`)
          } else {
            setErr(null)
            setValue(name, parsed)
          }
        }} />
      <Text size='small' color='dark-6'><i>{documentation}</i></Text>
    </Box>
  )
}

function BoolConfiguration({config: {name, default: def}, ctx, setValue}) {
  const value = ctx[name]
  useEffect(() => {
    if (!value && def) {
      setValue(def)
    }
  }, [value, def])

  return (
    <Box flex={false} direction='row' align='center' gap='xsmall'>
      <Toggle
        checked={value}
        onChange={({target: {checked}}) => setValue(name, checked)} />
      <Text size='small'>{name}</Text>
    </Box>
  )
}

function ConfigurationItem({config, ctx, setValue}) {
  switch (config.type) {
    case ConfigurationType.BOOL:
      return <BoolConfiguration config={config} ctx={ctx} setValue={setValue} />
    case ConfigurationType.INT:
      return <IntConfiguration config={config} ctx={ctx} setValue={setValue} />
    case ConfigurationType.DOMAIN:
      return <DomainConfiguration config={config} ctx={ctx} setValue={setValue} />
    case ConfigurationType.BUCKET:
      return <BucketConfiguration config={config} ctx={ctx} setValue={setValue} />
    default:
      return <StringConfiguration config={config} ctx={ctx} setValue={setValue} />
  }
}

function available(config, context) {
  if (!config.condition) return true

  const condition = config.condition
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
    const canConfigure = sections[nextInd].configuration.some((conf) => {
      return !ctx[conf.name] && available(conf, ctx)
    })
    if (canConfigure) break
    nextInd++
  }

  return nextInd
}

function RecipeConfiguration({recipe, context: ctx, setOpen}) {
  const sections = recipe.recipeSections
  const [oidc, setOidc] = useState(false)
  const [context, setContext] = useState(ctx)
  const [ind, setInd] = useState(findIndex(0, ctx, sections))
  const {repository} = sections[ind]
  const hasNext = sections.length > ind + 1
  const configuration = useMemo(() => sections[ind].configuration.reduce((acc, conf) => (
    {...acc, [conf.name]: conf}
  ), {}), [sections, ind])

  const [mutation, {loading, error}] = useMutation(INSTALL_RECIPE, {
    variables: {id: recipe.id, oidc, context: JSON.stringify(context)},
    update: (cache, {data: {installRecipe}}) => updateCache(cache, {
      query: BUILDS_Q,
      update: (prev) => appendConnection(prev, installRecipe, 'builds'),
    }),
    onCompleted: () => setOpen(false),
  })

  const setValue = useCallback((name, val) => (
    setContext({
      ...context,
      [repository.name]: {...(context[repository.name] || {}), [name]: val}
    })
  ), [setContext, context, repository])

  const next = useCallback(() => {
    if (!hasNext) return mutation()
    let nextInd = findIndex(ind + 1, context, sections)
    setInd(nextInd)
  }, [ind, setInd, hasNext, mutation])

  return (
    <ThemeContext.Extend value={{global: {input: {padding: '9px'}}}}>
      <Box fill gap='small' pad='small'>
        {error && <GqlError error={error} header='Error installing bundle' />}
        <Repository repo={repository} />
        <Box fill style={{overflow: 'auto', maxHeight: '70vh'}}>
          <Box flex={false} gap='12px'>
            {Object.values(configuration)
              .filter((conf) => available(conf, context[repository.name] || {}))
              .map((conf) => (
                <ConfigurationItem
                  key={conf.name}
                  config={conf}
                  setValue={setValue}
                  ctx={context[repository.name] || {}} />
            ))}
          </Box>
        </Box>
        <Box flex={false} direction='row' align='center' gap='small' justify='end'>
          {!hasNext && recipe.oidcEnabled && (
            <Box flex={false} direction='row' align='center' gap='xsmall'>
              <Toggle
                checked={oidc}
                onChange={({target: {checked}}) => setOidc(checked)} />
              <Text size='small'>{oidc ? 'oidc enabled' : 'oidc disabled'}</Text>
            </Box>
          )}
          {ind > 0 && <SecondaryButton label='Previous' onClick={() => setInd(ind - 1)} />}
          <Button 
            label={hasNext ? 'Continue' : 'Install'} 
            loading={loading}
            onClick={next} />
        </Box>
      </Box>
    </ThemeContext.Extend>
  )
}

const buildContext = (contexts) => contexts.reduce((acc, {repository, context}) => ({...acc, [repository]: context}), {})

export function Configuration({recipe, setOpen}) {
  const {data} = useQuery(RECIPE_Q, {
    variables: {id: recipe.id},
    fetchPolicy: 'cache-and-network'
  })

  return (
    <Box animation='fadeIn' width={MODAL_WIDTH}>
      <ModalHeader text='Configure your installation' setOpen={setOpen} />
      <Box fill style={{minHeight: '150px'}}>
        {data && (
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