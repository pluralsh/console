export const ignoreEvent = (e: Event) => {
  e.stopPropagation()
  e.preventDefault()
}
