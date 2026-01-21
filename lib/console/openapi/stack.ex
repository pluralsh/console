defmodule Console.OpenAPI.Stack do
  use Console.OpenAPI.Base

  defschema List, "A list of stacks", %{
    type: :object,
    description: "A list of stacks",
    properties: %{
      data: array_of(Stack)
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
