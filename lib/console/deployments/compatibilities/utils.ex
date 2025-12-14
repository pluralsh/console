defmodule Console.Deployments.Compatibilities.Utils do
  import Console.Deployments.Ecto.Validations, only: [clean_version: 1]

  def versions_greater([_ | _] = versions, from) when is_binary(from) do
    clean_version(from)
    |> Version.parse()
    |> case do
      {:ok, %Version{} = vsn} ->
        Enum.filter(versions, fn next ->
          case Version.parse(next.version) do
            {:ok, %Version{} = next} -> :lt == Version.compare(vsn, next)
            _ -> false
          end
        end)
      _ -> versions
    end
  end
  def versions_greater(versions, _), do: versions

  def later?(vsn1, vsn2) do
    with {:ok, vsn1} <- Version.parse(clean_version(vsn1)),
         {:ok, vsn2} <- Version.parse(clean_version(vsn2)) do
      case Version.compare(vsn1, vsn2) do
        :gt -> true
        :eq -> true
        _ -> false
      end
    else
      _ -> false
    end
  end

  def blocking?(kube_vsns, kube_vsn, inc \\ 1)
  def blocking?(kube_vsns, kube_vsn, inc) when is_list(kube_vsns) do
    with {:ok, %{major: maj, minor: min}} <- Version.parse(clean_version(kube_vsn)) do
      minor = min + inc
      Enum.map(kube_vsns, &clean_version/1)
      |> Enum.all?(fn kube ->
        case Version.parse(kube) do
          {:ok, %{major: ^maj, minor: ^minor}} -> false
          _ -> true
        end
      end)
    else
      _ -> true
    end
  end
  def blocking?(_, _, _), do: false
end
