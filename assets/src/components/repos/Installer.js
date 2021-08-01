import React, { useState } from 'react'
import { Configuration } from './Configuration'
import { Recipes } from './Recipes'
import { SearchRepos } from './SearchRepositories'

export function Installer({setOpen}) {
  const [repo, setRepo] = useState(null)
  const [recipe, setRecipe] = useState(null)

  if (recipe) return <Configuration recipe={recipe} setOpen={setOpen} />

  if (repo) return <Recipes repo={repo} setOpen={setOpen} setRecipe={setRecipe} />

  return <SearchRepos setOpen={setOpen} setRepo={setRepo} />
}