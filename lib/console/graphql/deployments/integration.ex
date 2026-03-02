defmodule Console.GraphQl.Deployments.Integration do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.{Deployments}
  alias Console.Schema.{Issue, IssueWebhook}

  ecto_enum :chat_provider_connection_type, Console.Schema.ChatConnection.Type
  ecto_enum :issue_webhook_provider, IssueWebhook.Provider
  ecto_enum :issue_status, Issue.Status

  @desc "A chat connection is a way to connect Plural to a chat platform like Slack or Microsoft Teams"
  input_object :chat_provider_connection_attributes do
    field :name, non_null(:string), description: "the name of this chat connection"
    field :type, non_null(:chat_provider_connection_type), description: "the type of this chat connection"
    field :configuration, non_null(:chat_provider_connection_configuration_attributes)
  end

  input_object :chat_provider_connection_configuration_attributes do
    field :slack, :slack_connection_configuration_attributes
  end

  input_object :slack_connection_configuration_attributes do
    field :app_token, non_null(:string)
    field :bot_token, non_null(:string)
    field :bot_id,    :string
  end

  @desc "A chat connection is a way to connect Plural to a chat platform like Slack or Microsoft Teams"
  object :chat_provider_connection do
    field :id, non_null(:id)
    field :name, non_null(:string), description: "the name of this chat connection"
    field :type, non_null(:chat_provider_connection_type), description: "the type of this chat connection"
    field :configuration, non_null(:chat_provider_connection_configuration), description: "the configuration for this chat connection"

    timestamps()
  end

  object :chat_provider_connection_configuration do
    field :slack, :slack_connection_configuration, description: "the configuration for the slack connection"
  end

  object :slack_connection_configuration do
    field :bot_id, :string, description: "the bot id for the slack connection"
  end

  connection node_type: :chat_provider_connection

  @desc "input data for creating or updating an issue webhook (e.g. for Linear). For create, provider, url, name, and secret are required."
  input_object :issue_webhook_attributes do
    field :provider, :issue_webhook_provider
    field :url,      :string
    field :name,     :string
    field :secret,   :string
  end

  @desc "A webhook receiver for an issue provider like Linear"
  object :issue_webhook do
    field :id,       non_null(:id)
    field :provider, non_null(:issue_webhook_provider)
    field :name,     non_null(:string)

    field :url, non_null(:string),
      description: "the url for this specific webhook",
      resolve: fn hook, _, _ -> {:ok, IssueWebhook.url(hook)} end

    timestamps()
  end

  connection node_type: :issue_webhook

  @desc "An issue synced from an external provider (e.g. Linear)"
  object :issue do
    field :id, non_null(:id),
      description: "the unique identifier of the issue"

    field :provider, non_null(:issue_webhook_provider),
      description: "the provider (e.g., Linear, GitHub) that originated this issue"

    field :status, non_null(:issue_status),
      description: "the current status of the issue (e.g., open, in progress, completed, cancelled)"

    field :external_id, non_null(:string),
      description: "the identifier of the issue in the external provider system"

    field :url, non_null(:string),
      description: "the URL linking to this issue on the external provider"

    field :title, non_null(:string),
      description: "the title of the issue"

    field :body, non_null(:string),
      description: "the detailed description or body content of the issue"

    field :flow,      :flow, resolve: dataloader(Deployments), description: "the flow this issue is associated with"
    field :workbench, :workbench, resolve: dataloader(Deployments), description: "the workbench this issue is associated with"

    timestamps()
  end

  connection node_type: :issue

  object :integration_queries do
    connection field :chat_provider_connections, node_type: :chat_provider_connection do
      middleware Authenticated
      middleware Scope,
        resource: :integrations,
        action: :read
      arg :type, :chat_provider_connection_type
      arg :q,    :string

      resolve &Deployments.chat_connections/2
    end

    field :chat_provider_connection, :chat_provider_connection do
      middleware Authenticated
      middleware Scope,
        resource: :integrations,
        action: :read
      arg :id,   :id
      arg :name, :string

      resolve &Deployments.chat_connection/2
    end

    field :issue_webhook, :issue_webhook do
      middleware Authenticated
      middleware Scope,
        resource: :integrations,
        action: :read
      arg :id,   :id
      arg :name, :string

      resolve &Deployments.issue_webhook/2
    end

    connection field :issue_webhooks, node_type: :issue_webhook do
      middleware Authenticated
      middleware Scope,
        resource: :integrations,
        action: :read

      resolve &Deployments.issue_webhooks/2
    end
  end

  object :integration_mutations do
    field :upsert_chat_provider_connection, :chat_provider_connection do
      middleware Authenticated
      middleware Scope,
        resource: :integrations,
        action: :write
      arg :attributes, non_null(:chat_provider_connection_attributes)

      resolve &Deployments.upsert_chat_connection/2
    end

    field :delete_chat_provider_connection, :chat_provider_connection do
      middleware Authenticated
      middleware Scope,
        resource: :integrations,
        action: :write
      arg :id, non_null(:id)

      resolve &Deployments.delete_chat_connection/2
    end

    field :create_issue_webhook, :issue_webhook do
      middleware Authenticated
      middleware Scope,
        resource: :integrations,
        action: :write
      arg :attributes, non_null(:issue_webhook_attributes)

      resolve &Deployments.create_issue_webhook/2
    end

    field :update_issue_webhook, :issue_webhook do
      middleware Authenticated
      middleware Scope,
        resource: :integrations,
        action: :write
      arg :id,         non_null(:id)
      arg :attributes, non_null(:issue_webhook_attributes)

      resolve &Deployments.update_issue_webhook/2
    end

    field :delete_issue_webhook, :issue_webhook do
      middleware Authenticated
      middleware Scope,
        resource: :integrations,
        action: :write
      arg :id, non_null(:id)

      resolve &Deployments.delete_issue_webhook/2
    end
  end
end
