defmodule Console.OpenAPI.SCM.PrAutomation do
  @moduledoc """
  OpenAPI schema for PR automations.

  A PR automation defines templates and rules for automatically creating pull requests
  that modify infrastructure or application configurations.
  """
  use Console.OpenAPI.Base

  defschema List, "A list of PR automations", %{
    type: :object,
    description: "A paginated list of PR automations",
    properties: %{
      data: array_of(Console.OpenAPI.SCM.PrAutomation)
    }
  }

  defschema %{
    type: :object,
    title: "PrAutomation",
    description: "A PR automation template for creating infrastructure or application pull requests",
    properties: timestamps(%{
      id: string(description: "Unique identifier for the PR automation"),
      name: string(description: "Name of the PR automation"),
      identifier: string(description: "Repository identifier (e.g., owner/repo) for the PR automation"),
      documentation: string(description: "Documentation describing the PR automation's purpose and usage"),
      title: string(description: "Title template for generated pull requests"),
      message: string(description: "Message/body template for generated pull requests"),
      branch: string(description: "Default branch name for generated pull requests"),
      addon: string(description: "Name of the addon this PR automation is associated with, if any"),
      icon: string(description: "URL or reference to the PR automation's icon for light mode"),
      dark_icon: string(description: "URL or reference to the PR automation's icon for dark mode"),
      catalog_id: string(description: "ID of the catalog this PR automation belongs to"),
      project_id: string(description: "ID of the project this PR automation belongs to"),
      connection_id: string(description: "ID of the SCM connection used for creating pull requests"),
      cluster_id: string(description: "ID of the cluster this PR automation is associated with, if any"),
      service_id: string(description: "ID of the service this PR automation is associated with, if any"),
      configuration: array_of(Console.OpenAPI.SCM.PrConfiguration, description: "Configuration fields for the PR automation"),
    })
  }
end

defmodule Console.OpenAPI.SCM.PrConfiguration do
  @moduledoc """
  OpenAPI schema for PR automation configuration fields.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "PrConfiguration",
    description: "A configuration field for a PR automation",
    properties: %{
      name: string(description: "Name of the configuration field"),
      type: ecto_enum(Console.Schema.Configuration.Type, description: "Type of the configuration field (string, int, bool, domain, file, function, enum, password)"),
      default: string(description: "Default value for the configuration field"),
      documentation: string(description: "Documentation describing the configuration field"),
      longform: string(description: "Extended documentation for the configuration field"),
      placeholder: string(description: "Placeholder text for the configuration field input"),
      optional: boolean(description: "Whether the configuration field is optional"),
      validation: Console.OpenAPI.SCM.PrConfigurationValidation,
    }
  }
end

defmodule Console.OpenAPI.SCM.PrConfigurationValidation do
  @moduledoc """
  OpenAPI schema for PR configuration validation.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "PrConfigurationValidation",
    description: "Validation rules for a configuration field",
    properties: %{
      regex: string(description: "Regular expression pattern for validation"),
      message: string(description: "Error message to display when validation fails"),
    }
  }
end
