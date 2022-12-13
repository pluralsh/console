import {
  ReactElement,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { LoopingLogo, WizardStep, useActive } from '@pluralsh/design-system'
import { useQuery } from 'react-apollo'
import { Box } from 'grommet'
import { P } from 'honorable'

import { RECIPES_Q, RECIPE_Q } from '../../graphql/plural'
import { Recipe, RepositoryContext } from '../../../generated/graphql'

import { Configuration } from './Configuration'

const findContext = (contexts: Array<RepositoryContext>, repository: string): Record<string, unknown> => contexts
  .filter(ctx => ctx.repository === repository)
  .map(ctx => ctx.context)
  .reduce((acc, ctx) => ({ ...acc, ...ctx }), {})

export function Application({ ...props }: any): ReactElement {
  const { active, setData } = useActive<Record<string, unknown>>()
  const [context, setContext] = useState<Record<string, unknown>>(active.data || {})
  const [valid, setValid] = useState(true)
  const { data: { recipes: { edges: recipeEdges } = {} } = {} } = useQuery(RECIPES_Q, {
    variables: { id: active.key },
    fetchPolicy: 'cache-and-network',
  })

  // There should only be a single bundle available on the list
  const recipeBase = recipeEdges?.at(0)?.node
  const { data: recipe } = useQuery<{recipe: Recipe, context: Array<RepositoryContext>}>(RECIPE_Q, {
    variables: { id: recipeBase?.id },
    fetchPolicy: 'cache-and-network',
    skip: !recipeBase,
  })

  // Update step data on change
  useEffect(() => setData(context), [context, setData])
  const recipeContext = useMemo(() => findContext(recipe?.context || [], active.label),
    [recipe?.context, active.label])

  if (!recipe) {
    return (
      <WizardStep {...props}>
        <Box
          overflow="hidden"
          fill="vertical"
          justify="center"
        >
          <LoopingLogo overflow="hidden" />
        </Box>
      </WizardStep>
    )
  }

  if (recipe.recipe?.restricted) {
    return (
      <WizardStep
        valid
        {...props}
      >
        <h2>Cannot install app</h2>
        <span>This recipe has been marked restricted because it requires configuration, like ssh keys, that are only able to be securely configured locally</span>
      </WizardStep>
    )
  }

  return (
    <WizardStep
      valid={valid}
      data={context}
      {...props}
    >
      <P
        overline
        color="text-xlight"
        paddingBottom="medium"
      >configure {active.label}
      </P>
      <Configuration
        recipe={recipe.recipe}
        context={{ ...context, ...recipeContext }}
        setContext={setContext}
        setValid={setValid}
      />
    </WizardStep>
  )
}
