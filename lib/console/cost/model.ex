defmodule Console.Cost.Model do
  alias Console.Schema.Cluster

  defstruct [:cpu, :ram, :storage, :gpu, :zone_egress, :region_egress, :internet_egress]

  def resolve(resource, dimension) do
    dist = distro(resource)
    model = new(dist)
    case Map.get(resource, dimension) do
      val when is_float(val) ->
        scalar(round(val * 24 * cost(model, dimension)), dimension)
      _ -> nil
    end
  end

  def new(distro) do
    attrs = file(distro)

    %__MODULE__{
      cpu:             parse(attrs["CPU"]),
      ram:             parse(attrs["RAM"]),
      storage:         parse(attrs["storage"]),
      gpu:             parse(attrs["GPU"]),
      zone_egress:     parse(attrs["zoneNetworkEgress"]),
      region_egress:   parse(attrs["regionNetworkEgress"]),
      internet_egress: parse(attrs["internetNetworkEgress"]),
    }
  end

  def cost(%__MODULE__{ram: r}, :memory), do: r
  def cost(%__MODULE__{} = model, dimension), do: Map.get(model, dimension)

  defp parse(val) do
    case Float.parse(val) do
      {v, _} -> v
      _ -> 1.0
    end
  end

  @aws Console.priv_file!("cost/aws.json") |> Jason.decode!()
  @gcp Console.priv_file!("cost/gcp.json") |> Jason.decode!()
  @azure Console.priv_file!("cost/azure.json") |> Jason.decode!()
  @oracle Console.priv_file!("cost/oracle.json") |> Jason.decode!()

  defp file(:eks), do: @aws
  defp file(:gke), do: @gcp
  defp file(:aks), do: @azure
  defp file(:oke), do: @oracle
  defp file(_), do: @gcp

  defp distro(%{cluster: %Cluster{distro: distro}}), do: distro
  defp distro(_), do: :byok

  defp scalar(val, :memory), do: (val / (1024 ** 3))
  defp scalar(val, _), do: val
end
