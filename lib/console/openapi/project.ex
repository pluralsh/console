defmodule Console.OpenAPI.Project do
  use Console.OpenAPI.Base

  defschema List, "A paginated list of projects", %{
    type: :object,
    description: "A paginated list of projects",
    properties: %{
      data: array_of(Console.OpenAPI.Project)
    }
  }

  defschema %{
    type: :object,
    title: "Project",
    description: "A project is a top-level organizational unit that groups related resources such as clusters, stacks, pipelines, and services",
    properties: timestamps(%{
      id: %{type: :string, format: :uuid, description: "The unique identifier of the project"},
      name: %{type: :string, description: "The name of the project"},
      description: %{type: :string, description: "A human-readable description of the project"},
      default: %{type: :boolean, description: "Whether this is the default project for the instance"}
    })
  }
end
