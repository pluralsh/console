defmodule Console.GraphQl.Deployments.Integration do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.{Deployments}

  ecto_enum :chat_provider_connection_type, Console.Schema.ChatConnection.Type

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
  end
end
