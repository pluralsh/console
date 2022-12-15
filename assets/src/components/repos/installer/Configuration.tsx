import { ReactElement, useCallback } from 'react'
import { Flex, Span, Switch } from 'honorable'

import { useActive } from '@pluralsh/design-system'

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
  recipe, context, oidc, setContext, setValid, setOIDC,
}: {recipe: Recipe, context: Record<string, unknown>}): ReactElement {
  const { active } = useActive<Record<string, unknown>>()
  const sections = recipe.recipeSections
  const configurations = sections!.filter(section => section!.repository!.name === active.label).map(section => section!.configuration).flat()
  const setValue = useCallback((fieldName, value) => setContext({ ...context, ...{ [fieldName]: value } }), [setContext, context])

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
      {configurations?.length === 0 && (
        <Span
          color="text-light"
          body2
        >No configuration available.
        </Span>
      )}
      {recipe.oidcEnabled && (
        <div>
          <Switch
            checked={oidc}
            onChange={({ target: { checked } }) => setOIDC(checked)}
          >Enable OIDC
          </Switch>
        </div>
      )}
    </Flex>
  )
}
