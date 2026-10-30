defmodule Console.Helm.Interface.HTTP do
  alias Console.Schema.{HelmRepository, OCIAuth}

  @type t :: %__MODULE__{client: Req.Client.t, repo: HelmRepository.t}

  defstruct [:client, :repo]

  def client(%HelmRepository{} = repo) do
    %__MODULE__{client: build(repo), repo: repo}
  end

  def build(%HelmRepository{url: url} = repo) do
    Req.new(base_url: url, decode_body: false)
    |> add_auth(repo)
  end

  defp add_auth(client, %HelmRepository{provider: :basic, auth: %OCIAuth{basic: %{username: uname, password: pwd}}}) do
    Req.Request.merge_options(client, auth: {:basic, "#{uname}:#{pwd}"})
  end

  defp add_auth(client, %HelmRepository{provider: :bearer, auth: %OCIAuth{bearer: %{token: token}}}) do
    Req.Request.merge_options(client, auth: {:bearer, token})
  end

  defp add_auth(client, _), do: client
end

defimpl Console.Helm.Interface, for: Console.Helm.Interface.HTTP do
  import Console.Helm.Utils, only: [match_sorted: 2, has_wildcard?: 1]
  alias Console.Schema.HelmRepository
  alias Console.Helm.{Index, Chart}

  def index(%@for{client: client, repo: %HelmRepository{url: "http" <> _}}, prev) do
    case Req.get(client, url: "/index.yaml", headers: conditional_headers(prev)) do
      {:ok, %Req.Response{status: 304}} when not is_nil(prev) -> {:ok, prev}
      {:ok, %Req.Response{status: 200, body: body} = resp} when is_binary(body) ->
        with {:ok, idx} <- parse_index(body, prev),
          do: {:ok, %{idx | etag: header(resp, "etag"), last_modified: header(resp, "last-modified")}}
      _ -> {:error, "could not fetch helm index"}
    end
  end
  def index(_, _), do: {:error, "repository url requires a valid scheme (either http, https or oci)"}

  # plenty of hosts (eg raw.githubusercontent.com) don't honor conditional requests, so an identical body is
  # also treated as unchanged
  defp parse_index(body, prev) do
    sha = :crypto.hash(:sha256, body)
    case prev do
      %Index{sha: ^sha} -> {:ok, prev}
      _ ->
        with {:ok, yaml} <- Console.Utils.Yaml.decode(body),
          do: {:ok, Index.transform(%Index{entries: yaml["entries"], sha: sha})}
    end
  end

  defp conditional_headers(%Index{} = prev) do
    [{"if-none-match", prev.etag}, {"if-modified-since", prev.last_modified}]
    |> Enum.filter(fn {_, v} -> is_binary(v) end)
  end
  defp conditional_headers(_), do: []

  defp header(resp, name) do
    case Req.Response.get_header(resp, name) do
      [v | _] -> v
      _ -> nil
    end
  end

  def chart(%@for{repo: %HelmRepository{url: "http" <> _}} = client, %Index{indexed: %{} = indexed} = idx, chart, vsn) do
    with {:chart, %{^chart => charts}} <- {:chart, indexed},
         {:version, %Chart{} = chart} <- {:version, find_version(charts, idx.sorted[chart], vsn)},
         {:ok, url} <- check_url(chart.urls) do
      {:ok, client, url, chart.digest}
    else
      {:chart, _} -> {:error, "could not find chart #{chart}"}
      {:version, _} -> {:error, "could not find version #{vsn}"}
    end
  end
  def chart(_, _, _, _), do: {:error, "repository url requires a valid scheme (either http, https or oci)"}

  def download(%{client: client}, "https://" <> _ = url, to) do
    Req.Request.delete_option(client, :base_url)
    |> Req.get(url: url, into: to, redirect: true)
    |> handle_download()
  end

  def download(%{client: client}, url, to) do
    client
    |> Req.get(url: url, into: to, redirect: true)
    |> handle_download()
  end

  defp handle_download({:ok, %Req.Response{status: status}} = resp) when status in 200..299, do: resp
  defp handle_download({:ok, %Req.Response{status: status, body: body}}),
    do: {:error, "helm chart download failed status=#{status}: #{inspect(body)}"}
  defp handle_download(err), do: err

  defp check_url(["oci://" <> _ = url | _]), do: {:error, "invalid oci helm url: #{url}"}
  defp check_url([url | _]) when is_binary(url), do: {:ok, url}
  defp check_url(_), do: {:error, "no urls found for chart"}

  defp find_version(charts, sorted, vsn) do
    case has_wildcard?(vsn) do
      false -> Map.get(charts, vsn)
      true -> match_sorted(sorted || [], vsn)
    end
  end
end
