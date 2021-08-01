import React, { useCallback } from 'react'
import { useQuery } from 'react-apollo'
import { ModalHeader } from 'forge-core'
import { RECIPES_Q } from '../graphql/plural'
import { Box, Layer, Text } from 'grommet'
import { MODAL_WIDTH, PROVIDER_WIDTH } from './constants'
import { Container } from './Container'
import { Provider } from './Provider'
import { chunk } from 'lodash'

function Recipe({recipe, setRecipe}) {
  return (
    <Container
      direction='row'
      gap='medium'
      pad='medium'
      width='50%'
      onClick={() => setRecipe && setRecipe(recipe)}>
      {recipe.provider && (
        <Box width={PROVIDER_WIDTH + 'px'} align='center' justify='center'>
          <Provider provider={recipe.provider} width={PROVIDER_WIDTH - 5} />
        </Box>
      )}
      <Box fill='horizontal'>
        <Text weight='bold' size='small'>{recipe.name}</Text>
        <Text size='small'>{recipe.description}</Text>
      </Box>
    </Container>
  )
}

function RecipeGrid({edges, setRecipe}) {
  return (
    <Box flex={false} fill='horizontal' pad='small' gap='xsmall'>
      {chunk(edges, 2).map((pair, ind) => (
        <Box key={'chunk' + ind} direction='row' fill='horizontal' gap='xsmall' align='center'>
          {pair.map(({node: recipe}) => (
            <Recipe key={recipe.id} recipe={recipe} setRecipe={setRecipe} />
          ))}
        </Box>
      ))}
    </Box>
  )
}

export function Recipes({repo, setOpen, setRecipe}) {
  const {data} = useQuery(RECIPES_Q, {
    variables: {id: repo.id},
    fetchPolicy: 'cache-and-network'
  })
  const close = useCallback(() => setOpen(false), [setOpen])

  return (
    <Layer modal onEsc={close} onClickOutside={close}>
      <Box width={MODAL_WIDTH}>
        <ModalHeader text='Select a bundle to install' setOpen={setOpen} />
        <Box fill style={{overflow: 'auto', maxHeight: '80vh'}}>
          {data && data.recipes && (
            <RecipeGrid 
              edges={data.recipes.edges}
              setRecipe={setRecipe} />
          )}
        </Box>
      </Box>
    </Layer>
  )
}