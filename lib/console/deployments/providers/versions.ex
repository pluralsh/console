defmodule Console.Deployments.Providers.Versions do
  alias Console.Schema.Cluster
  import Console.Deployments.Providers.Parsers

  @eks File.read!("k8s-versions/eks.json") |> String.split(~r/\R/)
  @aks File.read!("k8s-versions/aks.json") |> Jason.decode!() |> parse_aks()
  @gke File.read!("k8s-versions/gke.json") |> Jason.decode!() |> parse_gke()

  def versions("gcp"), do: gke()
  def versions("aws"), do: eks()
  def versions("azure"), do: aks()
  def versions(_), do: :any

  def aks(), do: @aks

  def eks(), do: @eks

  def gke(), do: @gke

  def validate?(%Cluster{version: v, provider: %{cloud: c}}) do
    case versions(c) do
      :any -> true
      versions when is_list(versions) -> Enum.member?(versions, v)
    end
  end
  def validate?(%Cluster{provider: nil}), do: true
  def validate?(%Cluster{} = cluster) do
    Console.Repo.preload(cluster, [:provider])
  end
end
