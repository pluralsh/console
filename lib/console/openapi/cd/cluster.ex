defmodule Console.OpenAPI.CD.Cluster do
  @moduledoc """
  OpenAPI schema for clusters.

  A cluster represents a Kubernetes cluster that can be deployed to and managed through the platform.
  """
  use Console.OpenAPI.Base

  defschema List, "A paginated list of clusters", %{
    type: :object,
    description: "A paginated list of clusters",
    properties: %{
      data: array_of(Console.OpenAPI.CD.Cluster)
    }
  }

  defschema %{
    type: :object,
    title: "Cluster",
    description: "A Kubernetes cluster that can be deployed to and managed through the platform",
    properties: timestamps(%{
      id: string(description: "Unique identifier for the cluster"),
      name: string(description: "Human readable name of this cluster, will also translate to cloud k8s name"),
      handle: string(description: "A short, unique human readable name used to identify this cluster"),
      self: boolean(description: "Whether this is the management cluster itself"),
      protect: boolean(description: "If true, this cluster cannot be deleted"),
      virtual: boolean(description: "Whether this is a virtual cluster"),
      installed: boolean(description: "Whether the deploy operator has been registered for this cluster"),
      distro: ecto_enum(Console.Schema.Cluster.Distro, description: "The distribution of kubernetes this cluster is running (generic, eks, aks, gke, rke, k3s, openshift)"),
      metadata: object(additional_properties: %{type: :string}, description: "Arbitrary JSON metadata to store user-specific state of this cluster"),
      tags: array_of(Console.OpenAPI.CD.Tag, description: "Key/value tags to filter and organize clusters"),
      version: string(description: "Desired Kubernetes version for the cluster"),
      current_version: string(description: "Current Kubernetes version as reported by the deployment operator"),
      openshift_version: string(description: "The version of OpenShift this cluster is running, if applicable"),
      kubelet_version: string(description: "The lowest discovered kubelet version for all nodes in the cluster"),
      pinged_at: datetime(description: "Timestamp of the last ping from the deploy operator"),
      deleted_at: datetime(description: "Timestamp when this cluster was scheduled for deletion"),
      project_id: string(description: "ID of the project this cluster belongs to"),
      node_count: integer(description: "The number of nodes in this cluster"),
      pod_count: integer(description: "The number of pods in this cluster"),
      namespace_count: integer(description: "The number of namespaces in this cluster"),
      cpu_total: number(description: "The total CPU capacity of the cluster in cores"),
      memory_total: number(description: "The total memory capacity of the cluster in bytes"),
      cpu_util: number(description: "The current CPU utilization of the cluster as a percentage"),
      memory_util: number(description: "The current memory utilization of the cluster as a percentage"),
      availability_zones: array_of(string(), description: "The availability zones this cluster is running in"),
    })
  }
end

defmodule Console.OpenAPI.CD.ClusterInput do
  @moduledoc """
  OpenAPI schema for cluster creation/update input.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "ClusterInput",
    description: "Input for creating or updating a cluster",
    properties: %{
      name: string(description: "Human readable name for the cluster"),
      handle: string(description: "A short, unique human readable name used to identify this cluster"),
      metadata: object(additional_properties: %{type: :string}, description: "Arbitrary JSON metadata to store user-specific state"),
      project_id: string(description: "ID of the project this cluster belongs to"),
      tags: array_of(Console.OpenAPI.CD.TagInput, description: "Key/value tags to filter and organize clusters"),
    }
  }
end
