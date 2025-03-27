defmodule Console.GraphQl.Deployments.Flow do
  use Console.GraphQl.Schema.Base
  alias Console.Middleware.AdminRequired
  alias Console.GraphQl.Resolvers.{Deployments, User}

  input_object :flow_attributes do
    field :name,                non_null(:string)
    field :description,         :string
    field :icon,                :string
    field :project_id,          :id
    field :read_bindings,       list_of(:policy_binding_attributes)
    field :write_bindings,      list_of(:policy_binding_attributes)
    field :server_associations, list_of(:mcp_server_association_attributes)
  end

  @desc "Input attributes for creating an mcp server"
  input_object :mcp_server_attributes do
    field :name,           non_null(:string)
    field :url,            non_null(:string)
    field :confirm,        :boolean, description: "whether tool calls against this server should require a confirmation"
    field :authentication, :mcp_server_authentication_attributes
    field :read_bindings,  list_of(:policy_binding_attributes)
    field :write_bindings, list_of(:policy_binding_attributes)
  end

  input_object :mcp_server_association_attributes do
    field :server_id, :id
  end

  input_object :mcp_server_authentication_attributes do
    field :plural, :boolean, description: "whether to use Plural's built-in JWT authentication"
    field :headers, list_of(:mcp_header_attributes)
  end

  input_object :mcp_header_attributes do
    field :name,  non_null(:string)
    field :value, non_null(:string)
  end

  object :flow do
    field :id,          non_null(:id)
    field :name,        non_null(:string)
    field :description, :string
    field :icon,        :string

    field :servers, list_of(:mcp_server), resolve: dataloader(Deployments),
      description: "servers that are bound to this flow"

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

    connection field :alerts, node_type: :alert do
      resolve &Deployments.alerts_for_flow/3
    end

    timestamps()
  end

  object :mcp_server do
    field :id,             non_null(:id)
    field :name,           non_null(:string), description: "the name for this server"
    field :url,            non_null(:string), description: "the HTTP url the server is hosted on"
    field :authentication, :mcp_server_authentication, description: "authentication specs for this server"
    field :confirm,        :boolean, description: "whether a tool call against this server should require user confirmation"

    field :read_bindings,  list_of(:policy_binding),
      resolve: dataloader(Deployments),
      description: "read policy for this mcp server"
    field :write_bindings, list_of(:policy_binding),
      resolve: dataloader(Deployments),
      description: "write policy for this mcp server"

    connection field :audits, node_type: :mcp_server_audit do
      middleware AdminRequired

      resolve &Deployments.list_audits_for_flow/3
    end

    timestamps()
  end

  object :mcp_server_authentication do
    field :plural,  :boolean, description: "built-in Plural JWT authentication"
    field :headers, list_of(:mcp_server_header), description: "any custom HTTP headers needed for authentication"
  end

  object :mcp_server_header do
    field :name,  non_null(:string)
    field :value, non_null(:string)
  end

  object :mcp_server_audit do
    field :id,        non_null(:id)
    field :tool,      non_null(:string)
    field :arguments, :map
    field :server,    :mcp_server, resolve: dataloader(Deployments)
    field :actor,     :user,       resolve: dataloader(User)
    timestamps()
  end

  @desc "The description of a tool extracted from its MCP server"
  object :mcp_tool do
    field :name,         non_null(:string)
    field :description,  :string
    field :input_schema, :map
  end

  @desc "A tool related to an mcp server"
  object :mcp_server_tool do
    field :server, :mcp_server
    field :tool,   :mcp_tool
  end

  connection node_type: :flow
  connection node_type: :mcp_server
  connection node_type: :mcp_server_audit

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

    connection field :mcp_servers, node_type: :mcp_server do
      middleware Authenticated
      arg :q, :string

      resolve &Deployments.list_mcp_servers/2
    end

    field :mcp_server, :mcp_server do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.resolve_mcp_server/2
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

    field :upsert_mcp_server, :mcp_server do
      middleware Authenticated
      arg :attributes, non_null(:mcp_server_attributes)

      resolve &Deployments.upsert_mcp_server/2
    end

    field :delete_mcp_server, :mcp_server do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.delete_mcp_server/2
    end
  end
end
