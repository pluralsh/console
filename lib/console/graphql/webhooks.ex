defmodule Console.GraphQl.Webhooks do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.Webhook
  alias Console.Middleware.{Authenticated, Sandboxed}
  alias Console.Schema

  ecto_enum :webhook_type, Schema.Webhook.Type
  ecto_enum :webhook_health, Schema.Webhook.Status

  input_object :webhook_attributes do
    field :url, non_null(:string)
  end

  object :webhook do
    field :id,      non_null(:id)
    field :url,     non_null(:string)
    field :health,  non_null(:webhook_health)
    field :type,    non_null(:webhook_type)

    timestamps()
  end

  connection node_type: :webhook

  object :webhook_queries do
    connection field :webhooks, node_type: :webhook do
      middleware Authenticated

      resolve &Webhook.list_webhooks/2
    end
  end

  object :webhook_mutations do
    field :create_webhook, :webhook do
      middleware Authenticated
      middleware Sandboxed
      arg :attributes, non_null(:webhook_attributes)

      resolve safe_resolver(&Webhook.create_webhook/2)
    end

    field :delete_webhook, :webhook do
      middleware Authenticated
      middleware Sandboxed
      arg :id, non_null(:id)

      resolve safe_resolver(&Webhook.delete_webhook/2)
    end
  end
end
