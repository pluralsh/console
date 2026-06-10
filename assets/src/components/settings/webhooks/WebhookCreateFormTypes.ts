import {
  IssueWebhookFragment,
  IssueWebhookProvider,
  ObservabilityWebhookFragment,
  ObservabilityWebhookType,
  PolicyBindingFragment,
  WorkbenchJobActivityType,
} from 'generated/graphql'

export type CreateWebhookType = 'observability' | 'issue'

export type CreateWebhookFormState = {
  webhookType: CreateWebhookType
  observabilityType: Nullable<ObservabilityWebhookType>
  observabilityName: string
  observabilitySecret: string
  issueProvider: Nullable<IssueWebhookProvider>
  issueName: string
  issueSecret: string
  readBindings: PolicyBindingFragment[]
  writeBindings: PolicyBindingFragment[]
}

export type SetupGuideSelection = {
  webhookType: CreateWebhookType
  observabilityType: Nullable<ObservabilityWebhookType>
  issueProvider: Nullable<IssueWebhookProvider>
}

export type ExistingWebhook =
  | {
      webhookType: WorkbenchJobActivityType.Observability
      webhook: ObservabilityWebhookFragment
    }
  | {
      webhookType: WorkbenchJobActivityType.Ticketing
      webhook: IssueWebhookFragment
    }
