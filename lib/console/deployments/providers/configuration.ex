defmodule Console.Deployments.Providers.Configuration do
  alias Console.Schema.Cluster

  def conf(%Cluster{cloud_settings: %{gcp: %Cluster.CloudSettings.Gcp{project: p, region: r, network: n}}}) do
    [
      %{name: "project", value: p},
      %{name: "region", value: r},
      %{name: "network", value: n},
    ]
  end
  def conf(_), do: []
end
