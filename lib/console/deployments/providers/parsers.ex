defmodule Console.Deployments.Providers.Parsers do
  def parse_aks(%{"values" => [_ | _] = values}) do
    Enum.flat_map(values, &Map.keys(&1["patchVersions"]))
    |> Enum.uniq()
  end

  def parse_gke(%{"channels" => [_ | _] = channels}) do
    Enum.flat_map(channels, & &1["validVersions"])
    |> Enum.map(fn vsn ->
      case String.split(vsn, "-") do
        [vsn, _] -> vsn
        [vsn] -> vsn
      end
    end)
    |> Enum.uniq()
  end
end
