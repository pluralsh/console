defmodule Console.Deployments.Observer.Poller do
  import Console.Helm.Utils
  alias Console.Deployments.Git
  alias Console.Schema.{Observer, HelmRepository}
  alias Console.{Helm, OCI}

  def poll(%Observer{last_value: last, target: %{type: :helm, helm: %{url: u}} = target}) when is_binary(u),
    do: poll_helm(target, last)
  def poll(%Observer{last_value: last, target: %{type: :oci, oci: %{url: u}} = target}) when is_binary(u),
    do: poll_oci(target, last)
  def poll(%Observer{last_value: last, target: %{type: :git, git: %{repository_id: id}} = target}) when is_binary(id),
    do: poll_git(target, last)
  def poll(_), do: {:error, "no valid poller"}

  defp poll_helm(%{helm:  %{url: "oci://" <> url} = helm} = target, last) do
    target = put_in(target.helm.url, Path.join(url, helm.chart))
    poll_oci(%{target | oci: target.helm}, last)
  end

  defp poll_helm(%{helm: helm}, last) do
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

  defp poll_oci(%{oci: %{url: url} = oci} = target, last) do
    client = OCI.Client.new(url)
    with {:ok, oci} <- OCI.Auth.authenticate(client, oci.provider, oci.auth),
         {:ok, %OCI.Tags{tags: [_ | _] = tags}} <- OCI.Client.tags(oci),
         {:tag, [vsn | _]} <- {:tag, sorted(tags, target)},
         {:vsn, :gt} <- {:vsn, compare(vsn, last, target)} do
      {:ok, vsn}
    else
      {:tag, _} -> {:error, "could not fetch tag for oci repository #{url}"}
      {:vsn, _} -> :ignore
      err -> err
    end
  end

  def poll_git(%{git: %{repository_id: id}} = target, last) do
    with %Console.Schema.GitRepository{} = git <- Git.get_repository(id),
         {:tags, [_ | _] = tags} <- {:tags, Git.Discovery.tags(git)},
         [vsn | _] <- sorted(tags, target),
         {:vsn, :gt} <- {:vsn, compare(vsn, last, target)} do
      {:ok, vsn}
    else
      {:vsn, _} -> :ignore
      {:tags, _} -> {:error, "no tags found for this repo"}
      nil -> {:error, "no git repository with id #{id}"}
    end
  end

  defp formatted(val, %Observer.Target{format: f}) when is_binary(f) and is_binary(val) do
    with {:ok, r} <- Regex.compile(f),
         [_, semver | _] <- Regex.run(r, val) do # grab the first capture group which is assumed to be the substring
      semver
    else
      _ -> val
    end
  end
  defp formatted(val, _), do: val

  defp sorted(vsns, %Observer.Target{order: :semver} = target) do
    Enum.map(vsns, & {&1, formatted(&1, target)})
    |> Enum.filter(fn {_, v} -> is_semver?(v) end)
    |> Enum.sort(&compare_versions(elem(&1, 1), elem(&2, 1)) == :gt)
    |> Enum.map(&elem(&1, 0))
  end
  defp sorted(vsns, _), do: vsns

  defp sorted(vsns) do
    Enum.filter(vsns, &is_semver?/1)
    |> Enum.sort(&compare_versions(&1, &2) == :gt)
  end

  defp compare(_, _, %Observer.Target{order: :latest}), do: :gt
  defp compare(next, last, %Observer.Target{order: :semver} = target),
    do: compare_versions(formatted(next, target), formatted(last, target))
end
