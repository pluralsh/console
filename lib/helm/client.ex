defmodule Console.Helm.Client do
  alias Console.Helm.{Index, Chart}

  def index(url) do
    with {:ok, %Req.Response{status: 200, body: body}} <- Req.get("#{url}/index.yaml"),
         {:ok, yaml} <- YamlElixir.read_from_string(body) do
      {:ok, Index.transform(%Index{entries: yaml["entries"]})}
    else
      _ -> {:error, "fould not fetch helm index"}
    end
  end

  @spec chart(Index.t, binary, binary) :: {:ok, binary, binary} | Console.error
  def chart(%Index{entries: entries}, chart, vsn) do
    entries = Map.new(entries, & {&1.name, &1.versions})
    with {:chart, %{^chart => chart}} <- {:chart, entries},
         {:version, %Chart{} = chart} <- {:version, Enum.find(chart, & &1.version == vsn)} do
      {:ok, hd(chart.urls), chart.digest}
    else
      {:chart, _} -> {:error, "could not find chart #{chart}"}
      {:version, _} -> {:error, "could not find version #{vsn}"}
    end
  end

  def download(url, to), do: Req.get(url, into: to)
end
