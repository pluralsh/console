---
title: Console API
---

While the console API is not public facing, it's still available for you to explore and use if you wish. It has a built-in graphql interface like Plural itself, accessible at [`https://console.domain.com/graphiql`](https://console.domain.com/graphiql), with the actual graphql api available at [`https://console.domain.com/gql`](https://console.domain.com/gql).

The console does not have an API key system like Plural does, so you'll need to pull out a bearer token from the web app to interact with it directly. You can find this by just looking at the `Authorization` headers for gql requests in chrome inspector.
