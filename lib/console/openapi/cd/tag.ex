defmodule Console.OpenAPI.CD.Tag do
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "Tag",
    description: "A tag",
    properties: %{
      name: string(),
      value: string(),
    }
  }
end
