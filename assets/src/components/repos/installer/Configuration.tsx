import { ReactElement, useCallback } from 'react'
import { Flex, Switch } from 'honorable'

import { ConfigurationItem as ConfigurationItemType, Recipe } from '../../../generated/graphql'
import { OperationType } from '../constants'

import { ConfigurationItem } from './ConfigurationItem'

const available = (config, context) => {
  if (!config.condition) return true

  const { condition } = config

  switch (condition.operation) {
  case OperationType.NOT:
    return !context[condition.field]
  }

  return true
}

export function Configuration({
  recipe, context, setContext, setValid,
}: {recipe: Recipe, context: Record<string, unknown>}): ReactElement {
  const sections = recipe.recipeSections
  const configurations = sections?.map(section => section?.configuration).flat()

  const setValue = useCallback((fieldName, value) => {
    setContext({ ...context, ...{ [fieldName]: value } })
  }, [setContext, context])

  return (
    <Flex
      gap="large"
      direction="column"
      marginRight="xsmall"
    >
      {configurations.filter(conf => available(conf, context)).map((conf: ConfigurationItemType) => (
        <ConfigurationItem
          key={`${recipe.name}-${conf.name}`}
          config={conf}
          ctx={context}
          setValue={setValue}
          setValid={setValid}
        />
      ))}
      {recipe.oidcEnabled && (
        <div>
          <Switch>Enable OIDC</Switch>
        </div>
      )}
    </Flex>
  )
}
