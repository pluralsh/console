---
title: Plural GraphQl API
description: >-
  Documentation about how to interact with the Plural GraphQl api directly.
---

# GraphQl API

Plural's primary underlying api is written in GraphQl, fully integrating datasources between kubernetes, the core plural postgres datastore, observability providers and more.

GraphQl auto-documents via the schema, and a lot of graphql editors provide a nice interface to interact with it, alongside typeahead for building queries and more.

A simple way to do this is to use the altair graphql client, which you can simply add to chrome [in the Chrome Web Store](https://chromewebstore.google.com/detail/altair-graphql-client/flnheeellpciglgpaodhkhmapeljopja?hl=en)

You'll want to add the endpoint as `https://{your-console-fqdn}/gql`.  To authenticate, just do the following:

1. Create an access token (simple way is `cmd + k -> access tokens`)
2. Add an `Authorization: Token {your-access-token}` header.

From there you should be able to explore the graphql api directly in your editor.