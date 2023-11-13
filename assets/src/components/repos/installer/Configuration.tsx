import {
  Dispatch,
  ReactElement,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
} from 'react'
import { Flex, Span } from 'honorable'
import { Switch, useActive, useNavigation } from '@pluralsh/design-system'

import {
  ConfigurationItem as ConfigurationItemType,
  Maybe,
  Recipe,
} from '../../../generated/graphql'
import { OperationType } from '../constants'

import { ConfigurationItem } from './ConfigurationItem'

const available = (config, context) => {
  if (!config.condition) return true

  const { condition } = config

  switch (condition.operation) {
    case OperationType.NOT:
      return !context[condition.field]?.value
    case OperationType.PREFIX:
      return (
        context[condition.field]?.value?.startsWith(condition.value) ?? false
      )
    case OperationType.EQUAL:
      return context[condition.field]?.value
  }

  return true
}

interface ConfigurationProps {
  recipe: Recipe
  context: Record<string, any>
  setContext: Dispatch<SetStateAction<Record<string, any>>>
  oidc?: boolean
  setOIDC: Dispatch<boolean>
}

export function Configuration({
  recipe,
  context,
  oidc,
  setContext,
  setOIDC,
}: ConfigurationProps): ReactElement {
  const { active, completed, setCompleted, setData } =
    useActive<Record<string, unknown>>()
  const { onNext } = useNavigation()
  const sections = recipe.recipeSections
  const configurations = sections!
    .filter((section) => section!.repository!.name === active.label)
    .map((section) => section!.configuration)
    .flat()
  const setValue = useCallback(
    (fieldName, value, valid = true) =>
      setContext((context) => ({
        ...context,
        ...{ [fieldName]: { value, valid } },
      })),
    [setContext]
  )
  const hiddenConfigurations = useMemo(
    () => configurations.filter((conf) => !available(conf, context)),
    [configurations, context]
  )

  useEffect(() => {
    hiddenConfigurations.forEach((conf) => {
      setContext((context) => ({
        ...context,
        ...{
          [conf!.name!]: { value: context[conf!.name!]?.value, valid: true },
        },
      }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiddenConfigurations.length, setContext])

  useEffect(() => {
    if (configurations.length === 0 && !completed && active.data?.id)
      setCompleted(true)
  }, [configurations.length, completed, active.data?.id, setCompleted])

  useEffect(() => {
    if (configurations.length === 0 && !active.data?.skipped && completed) {
      setData({ ...active.data, ...{ skipped: true } })
      onNext()
    }
  }, [active.data, completed, configurations.length, onNext, setData])

  return (
    <Flex
      gap="large"
      direction="column"
      marginRight="xsmall"
    >
      {configurations
        .filter((conf) => available(conf, context))
        .map((conf?: Maybe<ConfigurationItemType>) => (
          <ConfigurationItem
            key={`${recipe.name}-${conf?.name}`}
            config={conf}
            ctx={context}
            setValue={setValue}
          />
        ))}
      {configurations?.length === 0 && (
        <Span
          color="text-light"
          body2
        >
          Nothing needs doing here! You can continue.
        </Span>
      )}
      {recipe.oidcEnabled && (
        <div>
          <Switch
            checked={oidc}
            onChange={(checked) => setOIDC(checked)}
          >
            Enable OIDC
          </Switch>
        </div>
      )}
    </Flex>
  )
}
