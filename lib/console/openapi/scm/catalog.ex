defmodule Console.OpenAPI.SCM.Catalog do
  @moduledoc """
  OpenAPI schema for catalogs.

  A catalog is a collection of PR automations that can be used for self-service
  deployment workflows. Catalogs help organize and provide discoverability for
  available deployment templates.
  """
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
    description: "A catalog of PR automations for self-service deployment workflows",
    properties: timestamps(%{
      id: string(description: "Unique identifier for the catalog"),
      name: string(description: "Name of the catalog"),
      description: string(description: "Description of the catalog's purpose and contents"),
      category: string(description: "Category for organizing catalogs (e.g., infrastructure, applications)"),
      author: string(description: "Author or maintainer of the catalog"),
      icon: string(description: "URL or reference to the catalog's icon for light mode"),
      dark_icon: string(description: "URL or reference to the catalog's icon for dark mode"),
      project_id: string(description: "ID of the project this catalog belongs to"),
    })
  }
end

defmodule Console.OpenAPI.SCM.CatalogInput do
  @moduledoc """
  OpenAPI schema for catalog creation/update input.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "CatalogInput",
    description: "Input for creating or updating a catalog",
    properties: %{
      name: string(description: "Name for the catalog"),
      description: string(description: "Description of the catalog's purpose"),
      category: string(description: "Category for organizing the catalog"),
      author: string(description: "Author or maintainer of the catalog"),
      icon: string(description: "URL or reference to the catalog's icon for light mode"),
      dark_icon: string(description: "URL or reference to the catalog's icon for dark mode"),
      project_id: string(description: "ID of the project this catalog belongs to"),
    },
    required: [:name, :author]
  }
end
