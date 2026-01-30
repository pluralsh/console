defmodule Console.OpenAPI.AI.AgentRun do
  @moduledoc """
  OpenAPI schema for agent runs.

  An agent run represents a single execution of an AI coding agent within a runtime.
  Runs process prompts and work on repositories to analyze or write code.
  """
  use Console.OpenAPI.Base

  defschema List, "A list of agent runs", %{
    type: :object,
    description: "A paginated list of agent runs",
    properties: %{
      data: array_of(Console.OpenAPI.AI.AgentRun)
    }
  }

  defschema %{
    type: :object,
    title: "AgentRun",
    description: "An execution of an AI coding agent processing a prompt against a repository",
    properties: timestamps(%{
      id: string(description: "Unique identifier for the agent run"),
      prompt: string(description: "The prompt given to the AI agent to process"),
      repository: string(description: "The git repository URL the agent is working on"),
      branch: string(description: "The git branch the agent is operating on (uses default branch if not set)"),
      status: ecto_enum(Console.Schema.AgentRun.Status, description: "Current status of the agent run (pending, running, successful, failed, cancelled)"),
      mode: ecto_enum(Console.Schema.AgentRun.Mode, description: "Mode of the agent run (analyze for read-only analysis, write for code modifications)"),
      language: ecto_enum(Console.Schema.AgentRun.Language, description: "Programming language used in the agent run (javascript, python, java, cpp, csharp, go, ruby, php, terraform)"),
      language_version: string(description: "Specific version of the programming language to use"),
      error: string(description: "Error message if the agent run failed"),
      shared: boolean(description: "Whether this agent run is shared publicly"),
      runtime_id: string(description: "ID of the runtime executing this agent run"),
      user_id: string(description: "ID of the user who initiated this agent run"),
      flow_id: string(description: "ID of the flow this agent run is associated with, if any"),
    })
  }
end

defmodule Console.OpenAPI.AI.AgentRunInput do
  @moduledoc """
  OpenAPI schema for agent run creation input.

  Defines the parameters needed to create a new agent run.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "AgentRunInput",
    description: "Input for creating a new agent run to execute an AI coding agent",
    properties: %{
      runtime_id: string(description: "The runtime ID to execute the agent run on"),
      prompt: string(description: "The prompt to give to the agent describing the task to perform"),
      repository: string(description: "The git repository URL the agent will work on (https or ssh format)"),
      mode: ecto_enum(Console.Schema.AgentRun.Mode, description: "Mode of the agent run (analyze for read-only, write for modifications)"),
      flow_id: string(description: "Optional flow ID to associate this agent run with"),
      shared: boolean(description: "Whether to share this agent run publicly"),
    },
    required: [:prompt, :repository, :mode, :runtime_id]
  }
end
