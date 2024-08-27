defmodule Console.Deployments.Observer.Poller do
  import Console.Helm.Utils
  alias Console.Schema.{Observer, HelmRepository}
  alias Console.{Helm, OCI}

  def poll(%Observer{last_value: last, target: %{helm: %{url: u} = helm}}) when is_binary(u),
    do: poll_helm(helm, last)
  def poll(%Observer{last_value: last, target: %{oci: %{url: u} = oci}}) when is_binary(u),
    do: poll_oci(oci, last)
  def poll(_), do: {:error, "no valid poller"}

  defp poll_helm(%{url: "oci://" <> url} = helm, last),
    do: poll_oci(%{helm | url: Path.join(url, helm.chart)}, last)

  defp poll_helm(helm, last) do
    client = Helm.Client.client(%HelmRepository{
      url: helm.url,
      provider: helm.provider,
      auth: helm.auth
    })
    with {:ok, idx} <- Helm.Client.index(client),
         {:chart, %{versions: [_ | _] = versions}} <- {:chart, Enum.find(idx.entries, & &1.name == helm.chart)},
         {:chart, [vsn | _]} <- {:chart, Enum.map(versions, & &1.version) |> sorted()},
         {:vsn, :gt} <- {:vsn, compare_versions(vsn, last)} do
      {:ok, vsn}
    else
      {:chart, _} -> {:error, "could not find chart #{helm.chart}"}
      {:vsn, _} -> :ignore
      err -> err
    end
  end

  defp poll_oci(%{url: url} = oci, last) do
    client = OCI.Client.new(url)
    with {:ok, oci} <- OCI.Auth.authenticate(client, oci.provider, oci.auth),
         {:ok, %OCI.Tags{tags: [_ | _] = tags}} <- OCI.Client.tags(oci),
         {:tag, [vsn | _]} <- {:tag, sorted(tags)},
         {:vsn, :gt} <- {:vsn, compare_versions(vsn, last)} do
      {:ok, vsn}
    else
      {:tag, _} -> {:error, "could not fetch tag for oci repository #{url}"}
      {:vsn, _} -> :ignore
      err -> IO.inspect(err)
    end
  end

  defp sorted(vsns) do
    Enum.filter(vsns, &is_semver?/1)
    |> Enum.sort(&compare_versions(&1, &2) == :gt)
  end
end
