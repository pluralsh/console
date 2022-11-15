import { useLocation } from 'react-router-dom'

export function useQueryParams() {
  const location = useLocation()

  return new URLSearchParams(location.search)
}

export function toMap(params) {
  return [...params.entries()].reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
}

export function asQuery(params) {
  const search = new URLSearchParams()

  for (const [k, v] of Object.entries(params)) {
    search.set(k, v)
  }

  return search.toString()
}
