defmodule Console.Deployments.Compatibilities.Table do
  use GenServer
  import Console.Deployments.Ecto.Validations, only: [clean_version: 1]
  alias Console.Deployments.Compatibilities.AddOn
  alias Console.Schema.{RuntimeService}
  alias ETS.KeyValueSet
  require Logger

  @table :addon_compatibilities
  @poll :timer.minutes(30)
  @url "https://raw.githubusercontent.com/pluralsh/console/master/static/compatibilities/"

  defmodule State do
    defstruct [:table, :url]
  end

  def start_link(opt \\ :ok) do
    GenServer.start_link(__MODULE__, opt, name: __MODULE__)
  end

  def init(_) do
    :timer.send_interval(@poll, :poll)
    send self(), :poll
    {:ok, table} = KeyValueSet.new(name: @table, read_concurrency: true, ordered: true)
    {:ok, %State{table: table, url: @url}}
  end

  def fetch(%RuntimeService{name: name, version: vsn}) do
    vsn = clean_version(vsn)
    with %AddOn{} = addon <- fetch(name),
      do: AddOn.find_version(addon, vsn)
  end

  def fetch(name) do
    case KeyValueSet.wrap_existing(@table) do
      {:ok, set} -> set[name]
      _ -> nil
    end
  end

  def handle_info(:poll, %State{table: table, url: url} = state) do
    with [_ | _] = addons <- fetch_manifest(url) do
      table = Enum.reduce(addons, table, fn name, table ->
        case fetch_addon(url, name) do
          {:ok, addon} -> KeyValueSet.put!(table, name, addon)
          _ ->
            Logger.warn "failed to fetch addon #{name}, will retry on next poll"
            table
        end
      end)
      {:noreply, %{state | table: table}}
    else
      err ->
        Logger.error "failed to fetch kubernetes addon manifest: #{inspect(err)}"
        {:noreply, state}
    end
  end

  defp fetch_manifest(url) do
    with {:ok, %HTTPoison.Response{status_code: 200, body: body}} <- HTTPoison.get(url <> "manifest.yaml"),
         {:ok, %{"names" => addons}} <- YamlElixir.read_from_string(body),
      do: addons
  end

  defp fetch_addon(url, addon) do
    with {:ok, %HTTPoison.Response{status_code: 200, body: body}} <- HTTPoison.get(url <> "#{addon}.yaml"),
         {:ok, res} <- YamlElixir.read_from_string(body),
         {:ok, encoded} <- Jason.encode(res),
      do: Poison.decode(encoded, as: AddOn.spec())
  end
end
