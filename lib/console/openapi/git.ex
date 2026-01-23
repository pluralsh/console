defmodule Console.OpenAPI.Git do
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "Git",
    description: "Git reference configuration",
    properties: %{
      ref: string(),
      folder: string()
    }
  }
end
