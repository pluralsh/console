defmodule Console.GraphQl.Deployments.Observability do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.{Deployments}
  alias Console.Schema.{ObservabilityWebhook, ObservabilityProvider, Alert}

  ecto_enum :observability_provider_type, ObservabilityProvider.Type
  ecto_enum :observability_webhook_type, ObservabilityWebhook.Type
  ecto_enum :alert_severity, Alert.Severity
  ecto_enum :alert_state, Alert.State

  input_object :observability_provider_attributes do
    field :type,        non_null(:observability_provider_type)
    field :name,        non_null(:string)
    field :credentials, non_null(:observability_provider_credentials_attributes)
  end

  input_object :observability_provider_credentials_attributes do
    field :datadog,  :datadog_credentials_attributes
    field :newrelic, :new_relic_credentials_attributes
  end

  input_object :datadog_credentials_attributes do
    field :api_key, non_null(:string)
    field :app_key, non_null(:string)
  end

  input_object :new_relic_credentials_attributes do
    field :api_key, non_null(:string)
  end

  input_object :observable_metric_attributes do
    field :identifier,  non_null(:string)
    field :provider_id, non_null(:id)
  end

  @desc "input data to persist a webhook receiver for an observability provider like grafana or datadog"
  input_object :observability_webhook_attributes do
    field :type,   non_null(:observability_webhook_type)
    field :name,   non_null(:string)
    field :secret, :string
  end

  object :observability_provider do
    field :id,          non_null(:id)
    field :type,        non_null(:observability_provider_type)
    field :name,        non_null(:string)

    timestamps()
  end

  object :observable_metric do
    field :id,         non_null(:id)
    field :identifier, non_null(:string)
    field :provider,   :observability_provider, resolve: dataloader(Deployments)

    timestamps()
  end

  @desc "A webhook receiver for an observability provider like grafana or datadog"
  object :observability_webhook do
    field :id,     non_null(:id)
    field :type,   non_null(:observability_webhook_type)
    field :name,   non_null(:string)

    field :url, non_null(:string),
      description: "the url for this specific webhook",
      resolve: fn hook, _, _ -> {:ok, ObservabilityWebhook.url(hook)} end

    timestamps()
  end

  object :alert do
    field :id,       non_null(:id)
    field :type,     non_null(:observability_webhook_type)
    field :severity, non_null(:alert_severity)
    field :state,    non_null(:alert_state)

    field :title,       :string
    field :message,     :string
    field :fingerprint, :string
    field :annotations, :map
    field :url,         :string

    field :tags, list_of(:tag), resolve: dataloader(Deployments), description: "key/value tags to filter clusters"

    field :cluster, :cluster, resolve: dataloader(Deployments), description: "the cluster this alert was associated with"
    field :service, :service, resolve: dataloader(Deployments), description: "the service this alert was associated with"
    field :project, :project, resolve: dataloader(Deployments), description: "the project this alert was associated with"

    timestamps()
  end

  connection node_type: :observability_provider
  connection node_type: :observability_webhook
  connection node_type: :alert

  object :observability_provider_queries do
    field :observability_provider, :observability_provider do
      middleware Authenticated
      arg :id,   :id
      arg :name, :string

      resolve &Deployments.get_observability_provider/2
    end

    connection field :observability_providers, node_type: :observability_provider do
      middleware Authenticated

      resolve &Deployments.list_observability_providers/2
    end

    field :observability_webhook, :observability_webhook do
      middleware Authenticated
      arg :id,   :id
      arg :name, :string

      resolve &Deployments.get_observability_webhook/2
    end

    connection field :observability_webhooks, node_type: :observability_webhook do
      middleware Authenticated

      resolve &Deployments.list_observability_webhooks/2
    end
  end

  object :observability_provider_mutations do
    field :upsert_observability_provider, :observability_provider do
      middleware Authenticated
      arg :attributes, non_null(:observability_provider_attributes)

      resolve &Deployments.upsert_observability_provider/2
    end

    field :delete_observability_provider, :observability_provider do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.delete_observability_provider/2
    end

    field :upsert_observability_webhook, :observability_webhook do
      middleware Authenticated
      arg :attributes, non_null(:observability_webhook_attributes)

      resolve &Deployments.upsert_observability_webhook/2
    end

    field :delete_observability_webhook, :observability_webhook do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.delete_observability_webhook/2
    end
  end
end
