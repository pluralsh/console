defmodule Console.Deployments.Providers.Configuration do
  alias Console.Schema.Cluster

  def conf(%Cluster{cloud_settings: %{gcp: %Cluster.CloudSettings.Gcp{project: p, region: r, network: n}}}) do
    [
      %{name: "project", value: p},
      %{name: "region", value: r},
      %{name: "network", value: n},
    ]
  end

  def conf(%Cluster{cloud_settings: %{azure: %Cluster.CloudSettings.Azure{} = az}}) do
    Enum.filter([
      %{name: "subscriptionId", value: az.subscription_id},
      %{name: "location", value: az.location},
      %{name: "resourceGroup", value: az.resource_group},
      %{name: "network", value: az.network}
    ], & &1.value)
  end

  def conf(%Cluster{cloud_settings: %{aws: %Cluster.CloudSettings.Aws{} = aws}}) do
    Enum.filter([
      %{name: "region", value: aws.region},
    ], & &1.value)
  end

  def conf(_), do: []
end
