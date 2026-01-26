defmodule Console.OpenAPI.CD.GlobalService do
  @moduledoc """
  OpenAPI schema for global services.

  A global service allows deploying a service template or an existing service across
  multiple clusters based on provider, distro, or tag matching criteria.
  """
  use Console.OpenAPI.Base

  defschema List, "A list of global services", %{
    type: :object,
    description: "A paginated list of global services",
    properties: %{
      data: array_of(GlobalService)
    }
  }

  defschema %{
    type: :object,
    title: "GlobalService",
    description: "A global service that deploys services across clusters matching specified criteria",
    properties: timestamps(%{
      id: string(description: "Unique identifier for the global service"),
      name: string(description: "Name of the global service"),
      distro: ecto_enum(Console.Schema.Cluster.Distro, description: "Target cluster distribution (e.g., eks, aks, gke, generic)"),
      reparent: boolean(description: "If true, allows reparenting of existing services owned by this global service"),
      mgmt: boolean(description: "If true, the global service will target the management cluster"),
      interval: string(description: "Polling interval for syncing the global service (e.g., \"5m\", \"1h\")"),
      project_id: string(description: "ID of the project this global service belongs to"),
      service_id: string(description: "ID of the source service to clone (mutually exclusive with template)"),
      provider_id: string(description: "ID of the cluster provider to filter target clusters"),
      tags: array_of(Console.OpenAPI.CD.Tag, description: "Tags used to match target clusters"),
      cascade: Console.OpenAPI.CD.Cascade,
      template: Console.OpenAPI.CD.ServiceTemplate,
    })
  }
end

defmodule Console.OpenAPI.CD.Cascade do
  @moduledoc """
  OpenAPI schema for cascade behavior on global service deletion.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "Cascade",
    description: "Cascade behavior when the global service is deleted",
    properties: %{
      delete: boolean(description: "If true, cascade delete all services owned by this global service"),
      detach: boolean(description: "If true, immediately detach services from the database without draining"),
    }
  }
end

defmodule Console.OpenAPI.CD.ServiceTemplate do
  @moduledoc """
  OpenAPI schema for service templates used by global services.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "ServiceTemplate",
    description: "A service template that defines how services are created from a global service",
    properties: timestamps(%{
      id: string(description: "Unique identifier for the service template"),
      name: string(description: "Name of the service to be created from this template"),
      namespace: string(description: "Kubernetes namespace for the service"),
      templated: boolean(description: "If true, the service configuration supports variable interpolation"),
      protect: boolean(description: "If true, prevents accidental deletion or modification of created services"),
      repository_id: string(description: "ID of the git repository backing this template"),
      contexts: array_of(string(), description: "List of service context names to include"),
      git: Console.OpenAPI.Git,
      helm: Console.OpenAPI.CD.HelmSpec,
      kustomize: Console.OpenAPI.CD.Kustomize,
    })
  }
end

defmodule Console.OpenAPI.CD.GlobalServiceInput do
  @moduledoc """
  OpenAPI schema for global service creation/update input.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "GlobalServiceInput",
    description: "Input for creating or updating a global service",
    properties: %{
      name: string(description: "Name for the global service"),
      distro: ecto_enum(Console.Schema.Cluster.Distro, description: "Target cluster distribution"),
      reparent: boolean(description: "If true, allows reparenting of existing services"),
      mgmt: boolean(description: "If true, target the management cluster"),
      interval: string(description: "Polling interval for syncing (e.g., \"5m\", \"1h\")"),
      provider_id: string(description: "ID of the cluster provider to filter target clusters"),
      project_id: string(description: "ID of the project this global service belongs to"),
      tags: array_of(Console.OpenAPI.CD.TagInput, description: "Tags used to match target clusters"),
      cascade: Console.OpenAPI.CD.CascadeInput,
      template: Console.OpenAPI.CD.ServiceTemplateInput,
    },
    required: [:name]
  }
end

defmodule Console.OpenAPI.CD.CascadeInput do
  @moduledoc """
  OpenAPI schema for cascade behavior input.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "CascadeInput",
    description: "Input for cascade behavior when the global service is deleted",
    properties: %{
      delete: boolean(description: "If true, cascade delete all services owned by this global service"),
      detach: boolean(description: "If true, immediately detach services from the database without draining"),
    }
  }
end

defmodule Console.OpenAPI.CD.TagInput do
  @moduledoc """
  OpenAPI schema for tag input.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "TagInput",
    description: "A tag used for matching clusters",
    properties: %{
      name: string(description: "Tag name"),
      value: string(description: "Tag value"),
    },
    required: [:name, :value]
  }
end

defmodule Console.OpenAPI.CD.ServiceTemplateInput do
  @moduledoc """
  OpenAPI schema for service template input.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "ServiceTemplateInput",
    description: "Input for a service template configuration",
    properties: %{
      name: string(description: "Name of the service to be created from this template"),
      namespace: string(description: "Kubernetes namespace for the service"),
      templated: boolean(description: "If true, enable variable interpolation in service configuration"),
      protect: boolean(description: "If true, prevent accidental deletion or modification"),
      repository_id: string(description: "ID of the git repository backing this template"),
      contexts: array_of(string(), description: "List of service context names to include"),
      git: Console.OpenAPI.Git,
      helm: Console.OpenAPI.CD.HelmSpecInput,
      kustomize: Console.OpenAPI.CD.KustomizeInput,
    },
    required: [:name, :namespace]
  }
end
