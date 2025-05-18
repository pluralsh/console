defmodule Console.Deployments.Compatibilities.CloudAddOns do
  use GenServer
  # import Console.Deployments.Ecto.Validations, only: [clean_version: 1]
  alias Console.Deployments.{Compatibilities.CloudAddOn, Static}
  alias Console.Schema.CloudAddon, as: AddOn
  alias ETS.KeyValueSet
  require Logger

  @table :clouds_addons
  @poll :timer.minutes(30)
  @url "/pluralsh/console/master/static/addons/"

  defmodule State do
    defstruct [:table, :url, :static, ready: false]
  end

  def start_link(opt \\ :ok) do
    GenServer.start_link(__MODULE__, opt, name: __MODULE__)
  end

  def init(_) do
    :timer.send_interval(@poll, :poll)
    send self(), :poll
    {:ok, table} = KeyValueSet.new(name: @table, read_concurrency: true, ordered: true)
    {:ok, %State{table: table, url: Console.github_raw_url(@url), static: Console.conf(:airgap)}}
  end

  def ping(), do: GenServer.call(__MODULE__, :ping)

  @spec fetch(AddOn.t) :: CloudAddOn.t | nil
  def fetch(%AddOn{name: name, distro: platform}), do: fetch("#{platform}", name)

  @spec fetch(binary, binary) :: CloudAddOn.t | nil
  def fetch(platform, name) do
    case KeyValueSet.wrap_existing(@table) do
      {:ok, set} -> set[{platform, name}]
      _ -> nil
    end
  end

  def handle_call(:ping, _, state), do: {:reply, state.ready, state}

  def handle_info(:poll, %State{table: table, static: true} = state) do
    table = Enum.reduce(Static.cloud_addons(), table, &persist(&2, &1))
    {:noreply, %{state | table: table, ready: true}}
  end

  def handle_info(:poll, %State{table: table, url: url} = state) do
    with [_ | _] = platforms <- fetch_manifest(url) do
      table = Enum.reduce(platforms, table, fn name, table ->
        case fetch_platform(url, name) do
          {:ok, addon} -> persist(table, addon)
          _ ->
            Logger.warning "failed to fetch platform #{name}, will retry on next poll"
            table
        end
      end)
      {:noreply, %{state | table: table, ready: true}}
    else
      err ->
        Logger.error "failed to fetch cloud addon manifest: #{inspect(err)}"
        {:noreply, state}
    end
  end

  defp fetch_manifest(url) do
    with {:ok, %HTTPoison.Response{status_code: 200, body: body}} <- HTTPoison.get(url <> "manifest.yaml"),
         {:ok, %{"platforms" => platforms}} <- YamlElixir.read_from_string(body),
      do: platforms
  end

  defp fetch_platform(url, platform) do
    case HTTPoison.get(url <> "#{platform}.yaml") do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        decode_cloud_addon(platform, body)
      _ ->
        {:error, "failed to fetch platform #{platform}"}
    end
  end

  defp decode_cloud_addon(name, yaml) do
    with {:ok, res} <- YamlElixir.read_from_string(yaml),
         {:ok, encoded} <- Jason.encode(res),
         {:ok, addons} <- Poison.decode(encoded, as: [CloudAddOn.spec()]),
      do: {:ok, {name, addons}}
  end

  def static() do
    base_path = "static/addons"
    {:ok, yaml} = File.read("#{base_path}/manifest.yaml")
    {:ok, %{"platforms" => [_ | _] = platforms}} = YamlElixir.read_from_string(yaml)
    Enum.map(platforms, fn name ->
      {:ok, yaml} = File.read("#{base_path}/#{name}.yaml")
      {:ok, addon} = decode_cloud_addon(name, yaml)
      addon
    end)
  end

  defp persist(table, {plat, addons}) do
    Enum.reduce(addons, table, fn %{name: name} = addon, table ->
      KeyValueSet.put!(table, {plat, name}, addon)
    end)
  end
end
