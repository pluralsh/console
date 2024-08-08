defmodule Console.GraphQl.Deployments.Observability do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.{Deployments}
  alias Console.Schema.ObservabilityProvider

  ecto_enum :observability_provider_type, ObservabilityProvider.Type

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

  connection node_type: :observability_provider

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
  end
end
