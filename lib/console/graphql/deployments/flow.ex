defmodule Console.GraphQl.Deployments.Flow do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.Deployments

  input_object :flow_attributes do
    field :name,           non_null(:string)
    field :description,    :string
    field :icon,           :string
    field :project_id,     :id
    field :read_bindings,  list_of(:policy_binding_attributes)
    field :write_bindings, list_of(:policy_binding_attributes)
  end

  object :flow do
    field :id,          non_null(:id)
    field :name,        non_null(:string)
    field :description, :string
    field :icon,        :string

    field :read_bindings,  list_of(:policy_binding), resolve: dataloader(Deployments), description: "read policy for this flow"
    field :write_bindings, list_of(:policy_binding), resolve: dataloader(Deployments), description: "write policy for this flow"
    field :project,        :project, resolve: dataloader(Deployments), description: "the project this flow belongs to"

    connection field :services, node_type: :service_deployment do
      resolve &Deployments.services_for_flow/3
    end

    connection field :pipelines, node_type: :pipeline do
      resolve &Deployments.pipelines_for_flow/3
    end

    connection field :pull_requests, node_type: :pull_request do
      resolve &Deployments.prs_for_flow/3
    end

    timestamps()
  end

  connection node_type: :flow

  object :flow_queries do
    connection field :flows, node_type: :flow do
      middleware Authenticated
      arg :q, :string

      resolve &Deployments.list_flows/2
    end

    field :flow, :flow do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.resolve_flow/2
    end
  end

  object :flow_mutations do
    field :upsert_flow, :flow do
      middleware Authenticated
      arg :attributes, non_null(:flow_attributes)

      resolve &Deployments.upsert_flow/2
    end

    field :delete_flow, :flow do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.delete_flow/2
    end
  end
end
