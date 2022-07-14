import { gql } from 'apollo-boost'

export const WebhookFragment = gql`
  fragment WebhookFragment on Webhook {
    id
    url
    health
    insertedAt
  }
`

export const WEBHOOKS_Q = gql`
  query Webhooks($cursor: String) {
    webhooks(first: 20, after: $cursor) {
      pageInfo {
        endCursor
        hasNextPage
      }
      edges {
        node {
          ...WebhookFragment
        }
      }
    }
  }
  ${WebhookFragment}
`

export const CREATE_WEBHOOK = gql`
  mutation CreateWebhook($attributes: WebhookAttributes!) {
    createWebhook(attributes: $attributes) {
      ...WebhookFragment
    }
  }
  ${WebhookFragment}
`

export const DELETE_WEBHOOK = gql`
  mutation DeleteWebhook($id: ID!) {
    deleteWebhook(id: $id) {
      ...WebhookFragment
    }
  }
  ${WebhookFragment}
`
