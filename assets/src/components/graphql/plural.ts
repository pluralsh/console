import { gql } from 'apollo-boost'

import { LogFilterFragment } from './kubernetes'

export const SmtpFragment = gql`
  fragment SmtpFragment on Smtp {
    server
    port
    sender
    user
    password
  }
`

export const LOG_FILTER_Q = gql`
  query LogFilters($namespace: String!) {
    logFilters(namespace: $namespace) {
      ...LogFilterFragment
    }
  }
  ${LogFilterFragment}
`

export const SMTP_Q = gql`
  query {
    smtp {
      ...SmtpFragment
    }
  }
  ${SmtpFragment}
`

export const UPDATE_SMTP = gql`
  mutation UpdateSmtp($smtp: SmtpInput!) {
    updateSmtp(smtp: $smtp) {
      ...SmtpFragment
    }
  }
  ${SmtpFragment}
`
