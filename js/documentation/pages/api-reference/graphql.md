---
title: Plural GraphQL API
description: >-
  Documentation about how to interact with the Plural GraphQL API directly.
---

# GraphQL API

Plural's primary underlying API is written in GraphQL, fully integrating data sources across Kubernetes, the core Plural Postgres datastore, observability providers and more.

GraphQL is self-documenting via its schema, and many GraphQL editors provide a nice interface for interacting with it, alongside typeahead for building queries and more.

A simple way to do this is to use the Altair GraphQL client, which you can add to Chrome [in the Chrome Web Store](https://chromewebstore.google.com/detail/altair-graphql-client/flnheeellpciglgpaodhkhmapeljopja?hl=en)

You'll want to add the endpoint as `https://{your-console-fqdn}/gql`.  To authenticate, do the following:

1. Create an access token (the simplest way is `cmd + k -> access tokens`)
2. Add an `Authorization: Token {your-access-token}` header.

From there, you should be able to explore the GraphQL API directly in your editor.