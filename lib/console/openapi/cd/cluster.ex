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
      data: array_of(Cluster)
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
      upgrade_plan: Console.OpenAPI.CD.ClusterUpgradePlan
    })
  }
end

defmodule Console.OpenAPI.CD.ClusterUpgradePlan do
  @moduledoc """
  OpenAPI schema for cluster upgrade plan.

  A checklist of tasks to complete to safely upgrade a cluster.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "ClusterUpgradePlan",
    description: "A checklist of tasks to complete to safely upgrade a cluster",
    properties: %{
      compatibilities: boolean(description: "Whether API compatibilities with all addons and Kubernetes are satisfied"),
      incompatibilities: boolean(description: "Whether mutual API incompatibilities with all addons and Kubernetes have been satisfied"),
      deprecations: boolean(description: "Whether all API deprecations have been cleared for the target version"),
      kubelet_skew: boolean(description: "Whether the kubelet version is in line with the current version")
    }
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

defmodule Console.OpenAPI.CD.ClusterUpgradeSummary do
  @moduledoc """
  OpenAPI schema for cluster upgrade summary.

  A consolidated view of all changes needed to upgrade a cluster, including failed insights
  and blocking addons that need to be updated before upgrading Kubernetes.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "ClusterUpgradeSummary",
    description: "A consolidated view of all changes needed to upgrade a cluster",
    properties: %{
      failed_insights: array_of(Console.OpenAPI.CD.UpgradeInsight, description: "List of failed upgrade insights blocking the upgrade"),
      blocking_addons: array_of(Console.OpenAPI.CD.RuntimeAddonUpgrade, description: "List of runtime addons that need to be upgraded"),
      blocking_cloud_addons: array_of(Console.OpenAPI.CD.CloudAddonUpgrade, description: "List of cloud addons that need to be upgraded")
    }
  }
end

defmodule Console.OpenAPI.CD.UpgradeInsight do
  @moduledoc """
  OpenAPI schema for upgrade insights.

  Upgrade insights are observations about potential issues that may affect a cluster upgrade,
  such as deprecated APIs or incompatible configurations.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "UpgradeInsight",
    description: "An insight about potential issues that may affect a cluster upgrade",
    properties: timestamps(%{
      id: string(description: "Unique identifier for the upgrade insight"),
      name: string(description: "Name of the upgrade insight"),
      version: string(description: "The Kubernetes version this insight applies to"),
      description: string(description: "Detailed description of the insight"),
      status: ecto_enum(Console.Schema.UpgradeInsight.Status, description: "Status of the insight (passing, failed, unknown, warning)"),
      refreshed_at: datetime(description: "Timestamp when this insight was last refreshed"),
      transitioned_at: datetime(description: "Timestamp when this insight last changed status"),
      details: array_of(Console.OpenAPI.CD.UpgradeInsightDetail, description: "Detailed information about the insight")
    })
  }
end

defmodule Console.OpenAPI.CD.UpgradeInsightDetail do
  @moduledoc """
  OpenAPI schema for upgrade insight details.

  Contains specific information about an upgrade insight, such as which APIs are deprecated
  and their replacements.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "UpgradeInsightDetail",
    description: "Detailed information about an upgrade insight",
    properties: timestamps(%{
      id: string(description: "Unique identifier for the detail"),
      status: ecto_enum(Console.Schema.UpgradeInsight.Status, description: "Status of this detail (passing, failed, unknown, warning)"),
      used: string(description: "The deprecated API or feature being used"),
      replacement: string(description: "The recommended replacement for the deprecated API"),
      replaced_in: string(description: "The version in which the API was replaced"),
      removed_in: string(description: "The version in which the API was removed"),
      last_used_at: datetime(description: "Timestamp when this API was last used")
    })
  }
end

defmodule Console.OpenAPI.CD.RuntimeAddonUpgrade do
  @moduledoc """
  OpenAPI schema for runtime addon upgrade information.

  Contains information about a runtime addon that needs to be upgraded before
  the cluster can be upgraded.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "RuntimeAddonUpgrade",
    description: "Information about a runtime addon that needs to be upgraded",
    properties: %{
      addon: Console.OpenAPI.CD.RuntimeAddon,
      current: Console.OpenAPI.CD.AddonVersion,
      fix: Console.OpenAPI.CD.AddonVersion,
      callout: string(description: "A rendered callout message with additional context for the upgrade")
    }
  }
end

defmodule Console.OpenAPI.CD.RuntimeAddon do
  @moduledoc """
  OpenAPI schema for runtime addons.

  A runtime addon is a Kubernetes component like cert-manager, istio, or ingress-nginx
  that extends the Kubernetes API.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "RuntimeAddon",
    description: "A Kubernetes runtime addon that extends the cluster's functionality",
    properties: %{
      name: string(description: "Name of the addon"),
      icon: string(description: "URL to the addon's icon"),
      git_url: string(description: "URL to the addon's git repository"),
      release_url: string(description: "URL to the addon's release page")
    }
  }
end

defmodule Console.OpenAPI.CD.AddonVersion do
  @moduledoc """
  OpenAPI schema for addon versions.

  Contains version information for a runtime addon, including Kubernetes compatibility.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "AddonVersion",
    description: "Version information for a runtime addon",
    properties: %{
      version: string(description: "Addon version, semver formatted"),
      kube: array_of(string(), description: "Kubernetes versions this addon version is compatible with"),
      chart_version: string(description: "The helm chart version for this addon version"),
      release_url: string(description: "URL to the release page for this version")
    }
  }
end

defmodule Console.OpenAPI.CD.CloudAddonUpgrade do
  @moduledoc """
  OpenAPI schema for cloud addon upgrade information.

  Contains information about a cloud-managed addon that needs to be upgraded
  before the cluster can be upgraded.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "CloudAddonUpgrade",
    description: "Information about a cloud addon that needs to be upgraded",
    properties: %{
      addon: Console.OpenAPI.CD.CloudAddon,
      current: Console.OpenAPI.CD.CloudAddonVersionInfo,
      fix: Console.OpenAPI.CD.CloudAddonVersionInfo,
      callout: string(description: "A rendered callout message with additional context for the upgrade")
    }
  }
end

defmodule Console.OpenAPI.CD.CloudAddon do
  @moduledoc """
  OpenAPI schema for cloud addons.

  A cloud addon is a cloud-provider managed component like EKS addons or GKE addons.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "CloudAddon",
    description: "A cloud-provider managed addon",
    properties: timestamps(%{
      id: string(description: "Unique identifier for the cloud addon"),
      distro: ecto_enum(Console.Schema.Cluster.Distro, description: "The Kubernetes distribution this addon belongs to"),
      name: string(description: "Name of the addon"),
      version: string(description: "Current version of the addon")
    })
  }
end

defmodule Console.OpenAPI.CD.CloudAddonVersionInfo do
  @moduledoc """
  OpenAPI schema for cloud addon version information.

  Contains version information for a cloud-managed addon.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "CloudAddonVersionInfo",
    description: "Version information for a cloud addon",
    properties: %{
      version: string(description: "The addon version"),
      compatibilities: array_of(string(), description: "Kubernetes versions this addon version is compatible with")
    }
  }
end
