import { ReactElement, useEffect, useMemo, useState } from 'react'
import {
  Chip,
  LoopingLogo,
  WizardStep,
  useActive,
} from '@pluralsh/design-system'
import { Box } from 'grommet'
import { Div, Span } from 'honorable'

import { useQuery } from '@apollo/client'

import { isNonNullable } from 'utils/isNonNullable'

import { RECIPES_Q, RECIPE_Q } from '../../graphql/plural'
import { Recipe, RepositoryContext } from '../../../generated/graphql'

import { Configuration } from './Configuration'

interface StepData {
  id: string | undefined
  oidc: boolean
  skipped?: boolean
  context: Record<string, unknown>
}

const findContext = (
  contexts: Array<RepositoryContext>,
  repository: string
): Record<string, unknown> =>
  contexts
    .filter((ctx) => ctx.repository === repository)
    .map((ctx) => ctx.context)
    .filter(isNonNullable)
    .reduce((acc, ctx) => ({ ...acc, ...ctx }), {})

export function Application({ ...props }: any): ReactElement {
  const { active, setData } = useActive<StepData>()
  const [context, setContext] = useState<Record<string, unknown>>(
    active.data?.context || {}
  )
  const [oidc, setOIDC] = useState(active.data?.oidc ?? false)
  const [valid, setValid] = useState(true)
  const {
    data: { recipes: { edges: recipeEdges } = { edges: undefined } } = {},
  } = useQuery(RECIPES_Q, {
    variables: { id: active.key },
  })

  // There should only be a single bundle available on the list
  const recipeBase = recipeEdges?.at(0)?.node

  const { data: recipe } = useQuery<{
    recipe: Recipe
    context: Array<RepositoryContext>
  }>(RECIPE_Q, {
    variables: { id: recipeBase?.id },
    skip: !recipeBase,
  })

  const recipeContext = useMemo(() => {
    const context = findContext(recipe?.context || [], active.label!)

    return Object.keys(context)
      .map((key) => ({ [key]: { value: context[key], valid: true } }))
      .reduce((acc, entry) => ({ ...acc, ...entry }), {})
  }, [recipe?.context, active.label])

  const mergedContext = useMemo<Record<string, unknown>>(
    () => ({ ...recipeContext, ...context }),
    [recipeContext, context]
  )
  const stepData = useMemo(
    () => ({
      ...active.data,
      ...{ id: recipe?.recipe.id },
      ...{ oidc },
      ...{ context: mergedContext },
    }),
    [active.data, mergedContext, oidc, recipe?.recipe.id]
  )

  useEffect(() => {
    const valid = Object.values<any>(context).every(({ valid }) => valid)

    setValid(valid)
  }, [context, setValid])

  // Update step data on change
  useEffect(() => setData(stepData), [stepData, setData])

  if (!recipe) {
    return (
      <WizardStep {...props}>
        <Box
          overflow="hidden"
          fill="vertical"
          justify="center"
        >
          {/* @ts-expect-error */}
          <LoopingLogo overflow="hidden" />
        </Box>
      </WizardStep>
    )
  }

  if (recipe.recipe?.restricted) {
    return (
      <WizardStep
        valid={false}
        {...props}
      >
        <Div
          marginTop="xxsmall"
          marginBottom="medium"
          display="flex"
          gap="medium"
          flexDirection="column"
        >
          <Span
            color="text-xlight"
            overline
          >
            Cannot install app
          </Span>
          <Span
            color="text-light"
            body2
          >
            This application has been marked restricted because it requires
            configuration, like ssh keys, that are only able to be securely
            configured locally.
          </Span>
        </Div>
      </WizardStep>
    )
  }

  return (
    <WizardStep
      valid={valid}
      data={stepData}
      {...props}
    >
      <Div
        marginBottom="medium"
        display="flex"
        lineHeight="24px"
        alignItems="center"
        height="24px"
      >
        <Span
          overline
          color="text-xlight"
        >
          configure {active.label}
        </Span>
        {active.isDependency && (
          <Chip
            size="small"
            hue="lighter"
            marginLeft="xsmall"
          >
            Dependency
          </Chip>
        )}
      </Div>
      <Configuration
        recipe={recipe.recipe}
        context={mergedContext}
        oidc={oidc}
        setContext={setContext}
        setOIDC={setOIDC}
      />
    </WizardStep>
  )
}
