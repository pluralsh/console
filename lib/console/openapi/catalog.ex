defmodule Console.OpenAPI.Catalog do
  use Console.OpenAPI.Base

  defschema List, "A list of catalogs", %{
    type: :object,
    description: "A paginated list of catalogs",
    properties: %{
      data: array_of(Catalog)
    }
  }

  defschema %{
    type: :object,
    title: "Catalog",
    description: "A catalog of PR automations",
    properties: timestamps(%{
      id: string(description: "Unique identifier for the catalog"),
      name: string(description: "Human-friendly name of the catalog"),
      description: string(description: "Long-form description of the catalog"),
      category: string(description: "Category name used for browsing"),
      author: string(description: "Author attribution for the catalog"),
      icon: string(description: "Icon URL for the catalog"),
      dark_icon: string(description: "Dark mode icon URL for the catalog"),
      project_id: string(description: "ID of the owning project"),
      tags: array_of(Console.OpenAPI.CD.Tag, description: "Tags associated with the catalog"),
    })
  }
end
