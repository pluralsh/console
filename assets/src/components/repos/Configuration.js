import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from 'react-apollo'
import { Box, CheckBox, Text, ThemeContext } from 'grommet'
import { Button, SecondaryButton, GqlError } from 'forge-core'
import { ModalHeader } from '../utils/Modal'
import { INSTALL_RECIPE, RECIPE_Q } from '../graphql/plural'
import { ConfigurationType, MODAL_WIDTH } from './constants'
import { Repository } from './SearchRepositories'
import { LabelledInput } from '../utils/LabelledInput'
import { appendConnection, updateCache } from '../../utils/graphql'
import { BUILDS_Q } from '../graphql/builds'

function compileConfigurations(items) {
  let res = {}
  for (const item of items) {
    for (const config of item.configuration) {
      res[config.name] = config
    }
  }
  return res
}

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
    <CheckBox 
      toggle 
      label={name}
      checked={value}
      onChange={({target: {checked}}) => setValue(name, checked)} />
  )
}

function ConfigurationItem({config, ctx, setValue}) {
  switch (config.type) {
    case ConfigurationType.BOOL:
      return <BoolConfiguration config={config} ctx={ctx} setValue={setValue} />
    case ConfigurationType.INT:
      return <IntConfiguration config={config} ctx={ctx} setValue={setValue} />
    default:
      return <StringConfiguration config={config} ctx={ctx} setValue={setValue} />
  }
}

function RecipeConfiguration({recipe, context: ctx, setOpen}) {
  const sections = recipe.recipeSections
  const [context, setContext] = useState(ctx)
  const [ind, setInd] = useState(0)
  const {repository, recipeItems} = sections[ind]
  const hasNext = sections.length > ind + 1
  const configuration = useMemo(() => compileConfigurations(recipeItems), [recipeItems])

  const [mutation, {loading, error}] = useMutation(INSTALL_RECIPE, {
    variables: {id: recipe.id, context: JSON.stringify(context)},
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
    setInd(ind + 1)
  }, [sections, ind, setInd, hasNext])

  console.log(context)

  return (
    <ThemeContext.Extend value={{global: {input: {padding: '9px'}}}}>
      <Box fill gap='small'>
        {error && <GqlError error={error} header='Error installing bundle' />}
        <Repository repo={repository} />
        <Box fill style={{overflow: 'auto', maxHeight: '70vh'}} pad='small'>
          <Box flex={false} gap='12px'>
            {Object.values(configuration).map((conf) => (
              <ConfigurationItem 
                key={conf.name} 
                config={conf}
                setValue={setValue}
                ctx={context[repository.name] || {}} />
            ))}
          </Box>
        </Box>
        <Box flex={false} direction='row' align='center' pad='small' 
             gap='small' justify='end'>
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