defmodule Console.Deployments.Compatibilities.Table do
  use GenServer
  import Console.Deployments.Ecto.Validations, only: [clean_version: 1]
  alias Console.Deployments.{Compatibilities.AddOn, Static}
  alias Console.Schema.{RuntimeService}
  alias ETS.KeyValueSet
  require Logger

  @table :addon_compatibilities
  @poll :timer.minutes(30)
  @url "/matrices/compatability/static/compatibilities.yaml"

  defmodule State do
    defstruct [:table, :url, :static, :ready]
  end

  def start_link(opt \\ :ok) do
    GenServer.start_link(__MODULE__, opt, name: __MODULE__)
  end

  def init(_) do
    :timer.send_interval(@poll, :poll)
    send self(), :poll
    {:ok, table} = KeyValueSet.new(name: @table, read_concurrency: true, ordered: true)
    table = Enum.reduce(Static.compatibilities(), table, &KeyValueSet.put!(&2, &1.name, &1))
    {:ok, %State{table: table, url: Console.plrl_assets_url(@url), static: Console.conf(:airgap)}}
  end

  def ping(), do: GenServer.call(__MODULE__, :ping)

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

  def handle_call(:ping, _, state), do: {:reply, state.ready, state}

  def handle_info(:poll, %State{table: table, static: true} = state) do
    table = Enum.reduce(Static.compatibilities(), table, &KeyValueSet.put!(&2, &1.name, &1))
    {:noreply, %{state | table: table, ready: true}}
  end

  def handle_info(:poll, %State{table: table, url: url} = state) do
    with [_ | _] = addons <- fetch_addons(url) do
      Enum.reduce(addons, table, fn addon, table ->
        case decode_addon(addon) do
          {:ok, addon} -> KeyValueSet.put!(table, addon.name, addon)
          _ ->
            Logger.warning "failed to fetch addon #{addon.name}, will retry on next poll"
            table
        end
      end)
      {:noreply, %{state | table: table, ready: true}}
    else
      err ->
        Logger.error "failed to fetch kubernetes addon manifest: #{inspect(err)}"
        {:noreply, state}
    end
  end

  defp fetch_addons(url) do
    with {:ok, %HTTPoison.Response{status_code: 200, body: body}} <- HTTPoison.get(url),
         {:ok, %{"addons" => addons}} <- YamlElixir.read_from_string(body),
      do: addons
  end

  defp decode_addon(raw) do
    with {:ok, encoded} <- Jason.encode(raw),
       do: Poison.decode(encoded, as: AddOn.spec())
  end

  defp decode_addon(name, yaml) do
    with {:ok, addon} <- YamlElixir.read_from_string(yaml),
         {:ok, encoded} <- Jason.encode(addon),
         {:ok, addon} <- Poison.decode(encoded, as: AddOn.spec()),
      do: {:ok, %{addon | name: name}}
  end

  def static() do
    base_path = "static/compatibilities"
    {:ok, yaml} = File.read("#{base_path}/manifest.yaml")
    {:ok, %{"names" => [_ | _] = addons}} = YamlElixir.read_from_string(yaml)
    Enum.map(addons, fn name ->
      {:ok, yaml} = File.read("#{base_path}/#{name}.yaml")
      {:ok, addon} = decode_addon(name, yaml)
      %{addon | name: name}
    end)
  end
end
