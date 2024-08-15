defmodule Console.Helm.Interface.HTTP do
  alias Console.Schema.{HelmRepository, OCIAuth}

  defstruct [:client, :repo]

  def client(%HelmRepository{} = repo) do
    %__MODULE__{client: build(repo), repo: repo}
  end

  def build(%HelmRepository{url: url} = repo) do
    Req.new(base_url: url)
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
  alias Console.Helm.{Index, Chart}

  def index(%{client: client}) do
    with {:ok, %Req.Response{status: 200, body: body}} <- Req.get(client, url: "/index.yaml"),
         {:ok, yaml} <- YamlElixir.read_from_string(body) do
      {:ok, Index.transform(%Index{entries: yaml["entries"]})}
    else
      _ -> {:error, "fould not fetch helm index"}
    end
  end

  def chart(client, %Index{entries: entries}, chart, vsn) do
    entries = Map.new(entries, & {&1.name, &1.versions})
    with {:chart, %{^chart => charts}} <- {:chart, entries},
         {:version, %Chart{} = chart} <- {:version, match_version(charts, vsn)} do
      {:ok, client, hd(chart.urls), chart.digest}
    else
      {:chart, _} -> {:error, "could not find chart #{chart}"}
      {:version, _} -> {:error, "could not find version #{vsn}"}
    end
  end

  def download(%{client: client}, "https://" <> _ = url, to) do
    Req.Request.delete_option(client, :base_url)
    |> Req.get(url: url, into: to)
  end

  def download(%{client: client}, url, to), do: Req.get(client, url: url, into: to)
end
