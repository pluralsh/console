import { groupSuggestion, userSuggestion } from "../users/Typeaheads"
import { SEARCH_GROUPS, SEARCH_USERS } from "./queries"

export function fetchUsers(client, query, setSuggestions) {
  if (!query) return

  client.query({
    query: SEARCH_USERS,
    variables: {q: query}
  }).then(({data: {users: {edges}}}) => edges.map(({node}) => ({value: node, label: userSuggestion(node)})))
    .then(setSuggestions)
}

export function fetchGroups(client, query, setSuggestions) {
  if (!query) return

  client.query({
    query: SEARCH_GROUPS,
    variables: {q: query}
  }).then(({data: {groups: {edges}}}) => edges.map(({node}) => ({value: node, label: groupSuggestion(node)})))
    .then(setSuggestions)
}