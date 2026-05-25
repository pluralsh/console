export function displaySavedPromptTitle(title: string) {
  return title === 'Default' ? 'Saved prompt' : title
}

export function displaySavedPromptCategory(category: string) {
  return category === 'Default' ? 'General' : category
}
