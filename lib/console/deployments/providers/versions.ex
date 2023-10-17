defmodule Console.Deployments.Providers.Versions do
  import Console.Deployments.Providers.Parsers

  @eks File.read!("k8s-versions/eks.json") |> String.split(~r/\R/)
  @aks File.read!("k8s-versions/aks.json") |> Jason.decode!() |> parse_aks()
  @gke File.read!("k8s-versions/gke.json") |> Jason.decode!() |> parse_gke()

  def aks(), do: @aks

  def eks(), do: @eks

  def gke(), do: @gke
end
