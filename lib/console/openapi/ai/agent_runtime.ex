defmodule Console.OpenAPI.AI.AgentRuntime do
  @moduledoc """
  OpenAPI schema for agent runtimes.

  An agent runtime represents a configured environment for running AI coding agents.
  Runtimes are deployed on clusters and define how agent runs are executed.
  """
  use Console.OpenAPI.Base

  defschema List, "A list of agent runtimes", %{
    type: :object,
    description: "A paginated list of agent runtimes",
    properties: %{
      data: array_of(Console.OpenAPI.AI.AgentRuntime)
    }
  }

  defschema %{
    type: :object,
    title: "AgentRuntime",
    description: "An agent runtime configured on a cluster for executing AI coding agents",
    properties: timestamps(%{
      id: string(description: "Unique identifier for the agent runtime"),
      name: string(description: "Human-readable name of this runtime"),
      type: ecto_enum(Console.Schema.AgentRuntime.Type, description: "Type of agent runtime (claude, opencode, gemini, custom)"),
      ai_proxy: boolean(description: "Whether this runtime uses the built-in Plural AI proxy for LLM requests"),
      default: boolean(description: "Whether this is the default runtime for coding agents"),
      cluster_id: string(description: "ID of the cluster this runtime is deployed on"),
    })
  }
end
