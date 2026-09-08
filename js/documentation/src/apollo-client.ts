import { ApolloClient, InMemoryCache } from '@apollo/client'

const client = new ApolloClient({
  uri: 'https://app.plural.sh/gql',
  cache: new InMemoryCache(),
})

export default client
