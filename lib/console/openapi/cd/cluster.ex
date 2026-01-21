defmodule Console.OpenAPI.CD.Cluster do
  use Console.OpenAPI.Base

  defschema List, "A list of clusters", %{
    type: :object,
    description: "A list of clusters",
    properties: %{
      data: array_of(Cluster)
    }
  }

  defschema %{
    type: :object,
    title: "Cluster",
    description: "A cluster",
    properties: timestamps(%{
      id: string(),
      name: string(),
      handle: string(),
      distro: ecto_enum(Console.Schema.Cluster.Distro),
      metadata: object(additional_properties: %{type: :string}),
      tags: array_of(OpenAPI.CD.Tag),
      current_version: string(),
      openshift_version: string(),
      kubelet_version: string(),
      pinged_at: datetime(),
      node_count: integer(),
      pod_count: integer(),
      namespace_count: integer(),
      cpu_total: number(),
      memory_total: number(),
      cpu_util: number(),
      memory_util: number(),
      availability_zones: array_of(string()),
    })
  }
end

defmodule Console.OpenAPI.CD.ClusterInput do
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "ClusterInput",
    description: "A cluster input",
    properties: %{
      name: string(),
      handle: string(),
      metadata: object(additional_properties: %{type: :string}),
      # tags: array_of(OpenAPI.CD.Tag)
    }
  }
end
