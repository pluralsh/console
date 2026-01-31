defmodule Console.OpenAPI.Stack do
  use Console.OpenAPI.Base

  defschema List, "A list of stacks", %{
    type: :object,
    description: "A list of stacks",
    properties: %{
      data: array_of(Console.OpenAPI.Stack)
    }
  }

  defschema %{
    type: :object,
    title: "Stack",
    description: "An infrastructure stack",
    properties: timestamps(%{
      id: string(),
      name: string(),
      type: ecto_enum(Console.Schema.Stack.Type),
      status: ecto_enum(Console.Schema.Stack.Status),
      paused: boolean(),
      approval: boolean(),
      workdir: string(),
      manage_state: boolean(),
      interval: string(),
      deleted_at: datetime(),
      repository_id: string(),
      cluster_id: string(),
      project_id: string(),
      git: Console.OpenAPI.Git,
      tags: array_of(Console.OpenAPI.CD.Tag),
    })
  }
end

defmodule Console.OpenAPI.StackInput do
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "StackInput",
    description: "An infrastructure stack input",
    properties: %{
      name: string(),
      type: ecto_enum(Console.Schema.Stack.Type),
      repository_id: string(),
      cluster_id: string(),
      project_id: string(),
      git: Console.OpenAPI.Git,
      approval: boolean(),
      manage_state: boolean(),
      workdir: string(),
      interval: string(),
      paused: boolean(),
      tags: array_of(Console.OpenAPI.CD.Tag),
    }
  }
end

defmodule Console.OpenAPI.StackRun do
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "StackRun",
    description: "A stack run instance",
    properties: timestamps(%{
      id: string(),
      type: ecto_enum(Console.Schema.Stack.Type),
      status: ecto_enum(Console.Schema.Stack.Status),
      approval: boolean(),
      dry_run: boolean(),
      message: string(),
      workdir: string(),
      manage_state: boolean(),
      destroy: boolean(),
      cancellation_reason: string(),
      approved_at: datetime(),
      stack_id: string(),
      repository_id: string(),
      cluster_id: string(),
      git: Console.OpenAPI.Git,
    })
  }
end
