import { useCallback, useState } from 'react'

import { Layer } from 'grommet'

import { Configuration } from './Configuration'
import { Recipes } from './Recipes'
import { SearchRepos } from './SearchRepositories'

const Views = {
  CONF: 'c',
  REC: 'r',
  SEARCH: 's',
}

function view(repo, recipe) {
  if (recipe) return Views.CONF
  if (repo) return Views.REC

  return Views.SEARCH
}

export function Installer({ setOpen }) {
  const [repo, setRepo] = useState(null)
  const [recipe, setRecipe] = useState(null)
  const close = useCallback(() => setOpen(false), [setOpen])
  const v = view(repo, recipe)

  return (
    <Layer
      modal
      onEsc={close}
      onClickOutside={close}
    >
      {v === Views.CONF && (
        <Configuration
          recipe={recipe}
          setOpen={setOpen}
        />
      )}
      {v === Views.REC && (
        <Recipes
          repo={repo}
          setOpen={setOpen}
          setRecipe={setRecipe}
        />
      )}
      {v === Views.SEARCH && (
        <SearchRepos
          setOpen={setOpen}
          setRepo={setRepo}
        />
      )}
    </Layer>
  )
}
