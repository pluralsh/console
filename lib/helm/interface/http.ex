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
  import Console.Helm.Utils, only: [match_version: 2]
  alias Console.Schema.HelmRepository
  alias Console.Helm.{Index, Chart}

  def index(%@for{client: client, repo: %HelmRepository{url: "http" <> _}}) do
    with {:ok, %Req.Response{status: 200} = resp} <- Req.get(client, url: "/index.yaml"),
         {:ok, yaml} <- handle_body(resp) do
      {:ok, Index.transform(%Index{entries: yaml["entries"]})}
    else
      _ -> {:error, "fould not fetch helm index"}
    end
  end
  def index(_), do: {:error, "repository url requires a valid scheme (either http, https or oci)"}

  defp handle_body(%Req.Response{status: 200, body: %{} = body}), do: {:ok, body}
  defp handle_body(%Req.Response{status: 200, body: body}) when is_binary(body),
    do: YamlElixir.read_from_string(body)

  def chart(%@for{repo: %HelmRepository{url: "http" <> _}} = client, %Index{entries: entries}, chart, vsn) do
    entries = Map.new(entries, & {&1.name, &1.versions})
    with {:chart, %{^chart => charts}} <- {:chart, entries},
         {:version, %Chart{} = chart} <- {:version, match_version(charts, vsn)},
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
    |> Req.get(url: url, into: to)
  end

  def download(%{client: client}, url, to), do: Req.get(client, url: url, into: to)

  defp check_url(["oci://" <> _ = url | _]), do: {:error, "invalid oci helm url: #{url}"}
  defp check_url([url | _]) when is_binary(url), do: {:ok, url}
  defp check_url(_), do: {:error, "no urls found for chart"}
end
