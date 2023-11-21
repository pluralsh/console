defmodule Console.Deployments.Deprecations.Table do
  use GenServer
  alias Console.Schema.ServiceComponent
  alias ETS.KeyValueSet
  require Logger

  @table :api_deprecations
  @poll :timer.minutes(60)
  @url "https://raw.githubusercontent.com/pluralsh/console/master/static/versions.yml"

  defmodule State do
    defstruct [:table, :url]
  end

  defmodule Entry do
    defstruct [:group, :version, :kind, :deprecated_in, :removed_in, :replacement, :available_in, :component]
  end

  def name(%{group: g, version: v, kind: k}), do: "#{g}/#{v}.#{k}"

  def start_link(opt \\ :ok) do
    GenServer.start_link(__MODULE__, opt, name: __MODULE__)
  end

  def init(_) do
    :timer.send_interval(@poll, :poll)
    send self(), :poll
    {:ok, table} = KeyValueSet.new(name: @table, read_concurrency: true, ordered: true)
    {:ok, %State{table: table, url: @url}}
  end

  def fetch(%ServiceComponent{} = component) do
    case KeyValueSet.wrap_existing(@table) do
      {:ok, set} -> set[name(component)]
      _ -> nil
    end
  end

  def handle_info(:poll, %State{table: table, url: url} = state) do
    with [_ | _] = entries <- fetch_and_parse(url) do
      table = Enum.reduce(entries, table, &KeyValueSet.put!(&2, name(&1), &1))
      {:noreply, %{state | table: table}}
    else
      err ->
        Logger.error "failed to fetch kubernetes deprecation table: #{err}"
        {:noreply, state}
    end
  end

  defp fetch_and_parse(url) do
    with {:ok, %HTTPoison.Response{status_code: 200, body: body}} <- HTTPoison.get(url),
         {:ok, %{"deprecated-versions" => deprecated}} <- YamlElixir.read_from_string(body) do
      Enum.map(deprecated, &to_entry/1)
    end
  end

  defp to_entry(entry) do
    {group, version} = split(entry["version"])
    %Entry{
      group: group,
      version: version,
      kind: entry["kind"],
      deprecated_in: entry["deprecated-in"],
      removed_in: entry["removed-in"],
      replacement: entry["replacement-api"],
      available_in: entry["available-in"],
      component: entry["component"]
    }
  end

  defp split(gv) do
    case String.split(gv, "/") do
      [g, v] -> {g, v}
      [v] -> {"core", v}
    end
  end
end
