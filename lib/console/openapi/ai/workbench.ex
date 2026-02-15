defmodule Console.OpenAPI.AI.Workbench do
  @moduledoc """
  OpenAPI schema for workbenches.

  A workbench is a configured environment for running AI workbench jobs, with
  system prompts, tools, and optional coding/infrastructure capabilities.
  """
  use Console.OpenAPI.Base

  defschema List, "A list of workbenches", %{
    type: :object,
    description: "A paginated list of workbenches",
    properties: %{
      data: array_of(Console.OpenAPI.AI.Workbench)
    }
  }

  defschema %{
    type: :object,
    title: "Workbench",
    description: "A workbench for running AI jobs with configurable tools and prompts",
    properties: timestamps(%{
      id: string(description: "Unique identifier for the workbench"),
      name: string(description: "Human-readable name of the workbench"),
      description: string(description: "Description of the workbench"),
      system_prompt: string(description: "The system prompt for the workbench"),
      project_id: string(description: "ID of the project this workbench belongs to"),
      repository_id: string(description: "ID of the git repository for this workbench"),
      agent_runtime_id: string(description: "ID of the agent runtime for this workbench"),
    })
  }
end

defmodule Console.OpenAPI.AI.WorkbenchJobResultTodo do
  @moduledoc "OpenAPI schema for a single todo on a workbench job result."
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "WorkbenchJobResultTodo",
    description: "A todo item on the job result",
    properties: %{
      title: string(description: "Title of the todo"),
      description: string(description: "Description of the todo"),
      done: %{type: :boolean, description: "Whether the todo is completed"}
    }
  }
end

defmodule Console.OpenAPI.AI.WorkbenchJobResult do
  @moduledoc "OpenAPI schema for workbench job result (sideloaded on job)."
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "WorkbenchJobResult",
    description: "The result of a workbench job run (working theory, conclusion, todos)",
    properties: timestamps(%{
      id: string(description: "Unique identifier for the result"),
      working_theory: string(description: "The working theory for this result"),
      conclusion: string(description: "The conclusion for this result"),
      todos: array_of(Console.OpenAPI.AI.WorkbenchJobResultTodo, description: "Todos for this result"),
      workbench_job_id: string(description: "ID of the job this result belongs to"),
    })
  }
end

defmodule Console.OpenAPI.AI.WorkbenchJob do
  @moduledoc """
  OpenAPI schema for workbench jobs.

  A workbench job represents a single run of a workbench (e.g. one prompt execution).
  Result is always sideloaded as the natural output of the job.
  """
  use Console.OpenAPI.Base

  defschema List, "A list of workbench jobs", %{
    type: :object,
    description: "A paginated list of workbench jobs",
    properties: %{
      data: array_of(Console.OpenAPI.AI.WorkbenchJob)
    }
  }

  defschema %{
    type: :object,
    title: "WorkbenchJob",
    description: "A single run of a workbench",
    properties: timestamps(%{
      id: string(description: "Unique identifier for the job"),
      status: ecto_enum(Console.Schema.WorkbenchJob.Status, description: "Current status (pending, running, successful, failed, cancelled)"),
      prompt: string(description: "The prompt for this run"),
      error: string(description: "Error message when the job failed"),
      started_at: datetime(description: "When the run started"),
      completed_at: datetime(description: "When the run completed"),
      workbench_id: string(description: "ID of the workbench this job belongs to"),
      user_id: string(description: "ID of the user who created this run"),
      result: Console.OpenAPI.AI.WorkbenchJobResult,
    })
  }
end

defmodule Console.OpenAPI.AI.WorkbenchJobInput do
  @moduledoc """
  OpenAPI schema for creating a workbench job.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "WorkbenchJobInput",
    description: "Input for creating a new workbench job",
    properties: %{
      prompt: string(description: "The prompt for this job")
    },
    required: [:prompt]
  }
end
