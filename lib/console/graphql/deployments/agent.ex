defmodule Console.GraphQl.Deployments.Agent do
  use Console.GraphQl.Schema.Base
  alias Console.Deployments.Agents
  alias Console.Schema.{AgentRuntime, AgentRun}
  alias Console.GraphQl.Resolvers.{Deployments, User}

  ecto_enum :agent_runtime_type, AgentRuntime.Type
  ecto_enum :agent_run_status, AgentRun.Status

  input_object :agent_runtime_attributes do
    field :name,                non_null(:string), description: "the name of this runtime"
    field :type,                non_null(:agent_runtime_type), description: "the type of this runtime"
    field :create_bindings,     list_of(:agent_binding_attributes), description: "the policy for creating runs on this runtime"
  end

  input_object :agent_binding_attributes do
    field :user_email, :string, description: "the email of the user this binding is for"
    field :group_name, :string, description: "the name of the group this binding is for"
  end

  input_object :agent_run_attributes do
    field :prompt,     non_null(:string), description: "the prompt to give to the agent"
    field :repository, non_null(:string), description: "the repository the agent will be working in"
    field :flow_id,    :id, description: "the flow this agent run is associated with"
  end

  input_object :agent_run_status_attributes do
    field :status,        non_null(:agent_run_status), description: "the status of this agent run"
    field :pod_reference, :namespaced_name, description: "the kubernetes pod this agent is running on"
  end

  input_object :agent_pull_request_attributes do
    field :title,      non_null(:string), description: "the title of the pull request"
    field :body,       non_null(:string), description: "the body of the pull request"
    field :repository, non_null(:string), description: "the repository the agent will be working in"
    field :base,       non_null(:string), description: "the base branch of the pull request"
    field :head,       non_null(:string), description: "the head branch of the pull request"
  end

  object :agent_runtime do
    field :id,              non_null(:id)
    field :name,            non_null(:string), description: "the name of this runtime"
    field :type,            non_null(:agent_runtime_type), description: "the type of this runtime"

    field :cluster,         :cluster, resolve: dataloader(Deployments), description: "the cluster this runtime is running on"
    field :create_bindings, list_of(:policy_binding), resolve: dataloader(Deployments), description: "the policy for creating runs on this runtime"

    connection field :pending_runs, node_type: :agent_run do
      middleware ClusterAuthenticated

      resolve &Deployments.pending_agent_runs/3
    end

    timestamps()
  end

  object :agent_run do
    field :id,            non_null(:id)
    field :prompt,        non_null(:string), description: "the prompt this agent was given"
    field :repository,    non_null(:string), description: "the repository the agent will be working in"
    field :status,        non_null(:agent_run_status), description: "the status of this agent run"
    field :pod_reference, :agent_pod_reference, description: "the kubernetes pod this agent is running on"

    field :scm_creds,    :scm_creds, resolve: &Deployments.agent_scm_credentials/3
    field :plural_creds, :plural_creds, resolve: &Deployments.agent_plural_creds/3

    @desc "the kubernetes pod running this agent (should only be fetched lazily as this is a heavy operation)"
    field :pod, :pod do
      resolve fn run, _, _ -> Agents.run_pod(run) end
      middleware ErrorHandler
    end

    field :runtime, :agent_runtime, resolve: dataloader(Deployments), description: "the runtime this agent is using"
    field :user,    :user,          resolve: dataloader(User), description: "the user who initiated this agent run"
    field :flow,    :flow,          resolve: dataloader(Deployments), description: "the flow this agent is associated with"

    field :pull_requests, list_of(:pull_request),
      resolve: dataloader(Deployments),
      description: "the pull requests this agent run has created"

    timestamps()
  end

  object :scm_creds do
    field :username, non_null(:string)
    field :token,    non_null(:string)
  end

  object :agent_pod_reference do
    field :name,      non_null(:string)
    field :namespace, non_null(:string)
  end

  connection node_type: :agent_runtime
  connection node_type: :agent_run

  object :public_agent_queries do
    field :agent_runtime, :agent_runtime do
      middleware Authenticated, :cluster
      arg :id, non_null(:id)

      resolve &Deployments.agent_runtime/2
    end

    field :agent_run, :agent_run do
      middleware Authenticated, :cluster
      arg :id, non_null(:id)

      resolve &Deployments.agent_run/2
    end
  end

  object :public_agent_mutations do
    field :upsert_agent_runtime, :agent_runtime do
      middleware ClusterAuthenticated
      arg :attributes, non_null(:agent_runtime_attributes)

      resolve &Deployments.upsert_agent_runtime/2
    end

    field :delete_agent_runtime, :agent_runtime do
      middleware ClusterAuthenticated
      arg :id, non_null(:id)

      resolve &Deployments.delete_agent_runtime/2
    end

    field :update_agent_run, :agent_run do
      middleware ClusterAuthenticated
      arg :id, non_null(:id)
      arg :attributes, non_null(:agent_run_status_attributes)

      resolve &Deployments.update_agent_run/2
    end
  end

  object :agent_queries do
    connection field :agent_runtimes, node_type: :agent_runtime do
      middleware Authenticated
      arg :q,    :string
      arg :type, :agent_runtime_type

      resolve &Deployments.agent_runtimes/2
    end

    connection field :agent_runs, node_type: :agent_run do
      middleware Authenticated

      resolve &Deployments.agent_runs/2
    end
  end

  object :agent_mutations do
    field :cancel_agent_run, :agent_run do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.cancel_agent_run/2
    end

    field :create_agent_run, :agent_run do
      middleware Authenticated
      arg :runtime_id, non_null(:id)
      arg :attributes, non_null(:agent_run_attributes)

      resolve &Deployments.create_agent_run/2
    end

    field :agent_pull_request, :pull_request do
      middleware Authenticated
      arg :run_id,     non_null(:id)
      arg :attributes, non_null(:agent_pull_request_attributes)

      resolve &Deployments.agent_pull_request/2
    end
  end
end
