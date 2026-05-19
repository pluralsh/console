defmodule Console.Helm.Interface.OCI do
  alias Console.OCI.{Client, Auth}
  alias Console.Schema.{HelmRepository}

  defstruct [:client, :repo, :authed, :tags, :fetched_at]

  def client(%HelmRepository{} = repo) do
    %__MODULE__{client: Client.new(repo.url), tags: %{}, repo: repo, fetched_at: Timex.now() |> Timex.shift(minutes: -10)}
  end

  def authenticate(%__MODULE__{authed: true} = client), do: {:ok, client}
  def authenticate(%__MODULE__{client: client, repo: repo} = oci) do
    with {:ok, client} <- Auth.authenticate(client, repo.provider, repo.auth),
      do: {:ok, %{oci | client: client, authed: true}}
  end
end

defimpl Console.Helm.Interface, for: Console.Helm.Interface.OCI do
  alias Console.OCI.{Client, Manifest, Layer}
  import Console.Helm.Utils, only: [match_version: 2, has_wildcard?: 1]
  alias Console.Helm.{Index, Chart, Interface.OCI}

  def index(_), do: {:ok, %Index{}}

  def chart(%OCI{} = oci, %Index{}, chart, vsn) do
    with {:auth, {:ok, %{client: client} = oci}} <- {:auth, OCI.authenticate(oci)},
         chart_client = Client.append_repo(client, chart),
         {:charts, {:ok, oci, %Chart{} = chart}} <- {:charts, get_chart(%{oci | client: chart_client}, chart, vsn)},
         {:pull, {:ok, digest}} <- {:pull, get_digest(chart_client, chart.version)} do
      {:ok, %{oci | client: client}, {chart.name, digest}, digest}
    else
      {:auth, {:error, err}} -> {:error, {:auth, "failed to authenticate to oci: #{inspect(err)}"}}
      {:charts, {:error, err}} -> {:error, {:auth, "error fetching chart #{chart}: #{err}"}}
      {:pull, {:error, err}} -> {:error, "error pulling chart content: #{err}"}
    end
  end

  def download(%{client: client}, {chart, digest}, to) do
    Client.append_repo(client, chart)
    |> Client.download_blob(digest, to)
  end

  defp get_charts(%OCI{client: client, fetched_at: fetched_at, tags: tc} = oci, chart) do
    expired = Timex.now() |> Timex.shift(minutes: -5)
    with true <- Timex.before?(fetched_at, expired),
         {:ok, %{tags: tags}} <- Client.tags(client) do
      {:ok, %{oci | tags: Map.put(tc, chart, tags), fetched_at: Timex.now()}, Enum.map(tags, & %Chart{version: &1, name: chart})}
    else
      false -> {:ok, oci, Enum.map(tc[chart] || [], & %Chart{version: &1, name: chart})}
      err -> err
    end
  end

  defp get_digest(client, vsn) do
    with {:ok, %Manifest.V1{layers: layers}} <- Client.manifest(client, vsn),
         {:layer, %Layer{digest: digest}} <- {:layer, Enum.find(layers, &helm_layer?/1)} do
      {:ok, digest}
    else
      {:layer, _} -> {:error, "could not find valid helm layer from manifest"}
      error -> {:error, "could not fetch valid OCI manifest for #{vsn}: #{inspect(error)}"}
    end
  end

  defp get_chart(client, chart, vsn) do
    with true <- has_wildcard?(vsn),
         {:charts, {:ok, client, charts}} <- {:charts, get_charts(client, chart)},
         {:version, %Chart{} = chart} <- {:version, match_version(charts, vsn)} do
      {:ok, client, chart}
    else
      false -> {:ok, client, %Chart{name: chart, version: vsn}}
      {:charts, _} -> {:error, "could not find chart #{chart}"}
      {:version, _} -> {:error, "could not find version #{vsn}"}
    end
  end

  defp helm_layer?(%Layer{mediaType: "application/vnd.cncf.helm.chart.content.v1.tar+gzip"}), do: true
  defp helm_layer?(_), do: false
end
