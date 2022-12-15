import {
  ReactElement,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Chip,
  LoopingLogo,
  WizardStep,
  useActive,
} from '@pluralsh/design-system'
import { useQuery } from 'react-apollo'
import { Box } from 'grommet'
import { Div, Span } from 'honorable'

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
  const [oidc, setOIDC] = useState(false)
  const [valid, setValid] = useState(true)
  const { data: { recipes: { edges: recipeEdges } = {} } = {} } = useQuery(RECIPES_Q, {
    variables: { id: active.key },
  })

  // There should only be a single bundle available on the list
  const recipeBase = recipeEdges?.at(0)?.node
  const { data: recipe } = useQuery<{recipe: Recipe, context: Array<RepositoryContext>}>(RECIPE_Q, {
    variables: { id: recipeBase?.id },
    skip: !recipeBase,
  })

  const recipeContext = useMemo(() => findContext(recipe?.context || [], active.label),
    [recipe?.context, active.label])
  const mergedContext = useMemo(() => ({ ...recipeContext, ...context }), [recipeContext, context])

  // Update step data on change
  useEffect(() => setData({
    ...active.data, ...{ id: recipe?.recipe.id }, ...{ oidc }, ...{ context: mergedContext },
  }), [active.data, mergedContext, oidc, setData])

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
          >Dependency
          </Chip>
        )}
      </Div>
      <Configuration
        recipe={recipe.recipe}
        context={mergedContext}
        oidc={oidc}
        setContext={setContext}
        setValid={setValid}
        setOIDC={setOIDC}
      />
    </WizardStep>
  )
}
