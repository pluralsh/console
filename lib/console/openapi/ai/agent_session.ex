defmodule Console.OpenAPI.AI.AgentSession do
  @moduledoc """
  OpenAPI schema for agent sessions.

  An agent session represents an autonomous AI agent working on infrastructure tasks.
  Sessions are associated with chat threads and can perform operations like provisioning,
  terraform management, kubernetes operations, and more.
  """
  use Console.OpenAPI.Base

  defschema List, "A list of agent sessions", %{
    type: :object,
    description: "A paginated list of agent sessions",
    properties: %{
      data: array_of(Console.OpenAPI.AI.AgentSession)
    }
  }

  defschema %{
    type: :object,
    title: "AgentSession",
    description: "An autonomous AI agent session working on infrastructure tasks",
    properties: timestamps(%{
      id: string(description: "Unique identifier for the agent session"),
      type: ecto_enum(Console.Schema.AgentSession.Type, description: "Type of agent session (terraform, kubernetes, provisioning, search, manifests, chat, research)"),
      agent_id: string(description: "Internal agent identifier"),
      plan_confirmed: boolean(description: "Whether the provisioning plan has been confirmed by the user"),
      prompt: string(description: "The prompt given to the agent"),
      branch: string(description: "The git branch this session's pull request is operating on"),
      initialized: boolean(description: "Whether the agent session has been initialized"),
      done: boolean(description: "Whether the agent has declared the work for this session complete"),
      commit_count: integer(description: "Number of commits made by this agent session"),
      thread_id: string(description: "ID of the chat thread associated with this session"),
      connection_id: string(description: "ID of the cloud connection used by this session"),
      stack_id: string(description: "ID of the infrastructure stack associated with this session"),
      service_id: string(description: "ID of the service associated with this session"),
      cluster_id: string(description: "ID of the cluster associated with this session"),
      pull_request_id: string(description: "ID of the pull request created by this session"),
    })
  }
end

defmodule Console.OpenAPI.AI.AgentSessionInput do
  @moduledoc """
  OpenAPI schema for agent session creation input.

  Defines the parameters needed to create a new agent session.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "AgentSessionInput",
    description: "Input for creating a new agent session to execute autonomous infrastructure tasks",
    properties: %{
      type: enum(["terraform", "kubernetes"], description: "Type of agent session (terraform, kubernetes)"),
      prompt: string(description: "The prompt describing the task for the agent to perform"),
      plan_confirmed: boolean(description: "Whether the provisioning plan is pre-confirmed"),
      connection_id: string(description: "ID of the cloud connection to use for this session"),
      cluster_id: string(description: "ID of the cluster to use for this session"),
      done: boolean(description: "Whether to immediately mark this session as done"),
    },
    required: [:prompt]
  }
end
