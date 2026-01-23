defmodule Console.OpenAPI.PrAutomation do
  use Console.OpenAPI.Base

  defschema List, "A list of PR automations", %{
    type: :object,
    description: "A paginated list of PR automations",
    properties: %{
      data: array_of(PrAutomation)
    }
  }

  defschema %{
    type: :object,
    title: "PrAutomation",
    description: "A PR automation configuration",
    properties: timestamps(%{
      id: string(description: "Unique identifier for the PR automation"),
      name: string(description: "Name of the PR automation"),
      role: ecto_enum(Console.Schema.PrAutomation.Role, description: "High-level role of the automation"),
      documentation: string(description: "Optional documentation for this automation"),
      title: string(description: "Default PR title"),
      message: string(description: "Default PR message"),
      branch: string(description: "Explicit branch name to use when creating PRs"),
      branch_prefix: string(description: "Prefix to use when generating branch names"),
      identifier: string(description: "Repository identifier (e.g., org/repo)"),
      patch: boolean(description: "If true, generates a patch instead of a PR"),
      addon: string(description: "Associated add-on name, if applicable"),
      icon: string(description: "Icon URL for the automation"),
      dark_icon: string(description: "Dark mode icon URL for the automation"),
      labels: array_of(string(), description: "Labels to apply to created PRs"),
      git: Console.OpenAPI.Git,
      catalog_id: string(description: "Catalog ID this automation belongs to"),
      project_id: string(description: "Project ID this automation belongs to"),
      repository_id: string(description: "Repository ID for create-mode PRs"),
      cluster_id: string(description: "Cluster ID targeted by this automation"),
      service_id: string(description: "Service ID targeted by this automation"),
      connection_id: string(description: "SCM connection ID used to create PRs"),
      governance_id: string(description: "Governance controller ID for this automation"),
    })
  }
end
