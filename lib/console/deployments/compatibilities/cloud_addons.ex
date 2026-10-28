defmodule Console.Deployments.Compatibilities.CloudAddOns do
  use GenServer
  import Console.Deployments.Compatibilities.Utils, only: [proxy_config: 0]
  alias Console.Deployments.{Compatibilities.CloudAddOn, Compatibilities.Utils, Static}
  alias Console.Utils.HTTP
  alias Console.Schema.CloudAddon, as: AddOn
  alias ETS.KeyValueSet
  require Logger

  @table :clouds_addons
  @poll :timer.hours(6)
  @url "/matrices/compatability/static/addons/"

  defmodule State do
    defstruct [:table, :url, :static, :platforms, ready: false, validators: %{}]
  end

  def start_link(opt \\ :ok) do
    GenServer.start_link(__MODULE__, opt, name: __MODULE__)
  end

  def init(_) do
    :timer.send_interval(@poll, :poll)
    send self(), :poll
    {:ok, table} = KeyValueSet.new(name: @table, read_concurrency: true, ordered: true)
    table = Enum.reduce(Static.cloud_addons(), table, &persist(&2, &1))
    {:ok, %State{table: table, url: Console.plrl_assets_url(@url), static: Console.conf(:airgap)}}
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

  def handle_info(:poll, %State{} = state) do
    case Console.safely(fn -> poll(state) end, fn err -> {:error, err} end) do
      {:ok, %State{} = state} -> {:noreply, %{state | ready: true}}
      err ->
        Logger.error "failed to fetch cloud addon manifest: #{inspect(err)}"
        {:noreply, state}
    end
  end

  defp poll(state) do
    with {:ok, platforms, state} <- fetch_manifest(state),
      do: {:ok, Enum.reduce(platforms, state, &fetch_platform/2)}
  end

  # validators are only kept once a body decodes, so a bad file is refetched
  # on the next poll rather than skipped as unchanged
  defp fetch_manifest(%State{url: url, validators: vs, platforms: platforms} = state) do
    manifest = url <> "manifest.yaml"
    case HTTP.fetch_if_changed(manifest, vs[manifest], opts()) do
      {:ok, :unchanged, v} when is_list(platforms) -> {:ok, platforms, validated(state, manifest, v)}
      {:ok, body, v} when is_binary(body) ->
        with {:ok, %{"platforms" => [_ | _] = platforms}} <- Console.Utils.Yaml.decode(body),
          do: {:ok, platforms, %{validated(state, manifest, v) | platforms: platforms}}
      err -> err
    end
  end

  defp fetch_platform(name, %State{url: url, validators: vs, table: table} = state) do
    file = url <> "#{name}.yaml"
    with {:ok, body, v} when is_binary(body) <- HTTP.fetch_if_changed(file, vs[file], opts()),
         {:ok, addon} <- decode_cloud_addon(name, body) do
      %{validated(state, file, v) | table: persist(table, addon)}
    else
      {:ok, :unchanged, v} -> validated(state, file, v)
      _ ->
        Logger.warning "failed to fetch platform #{name}, will retry on next poll"
        state
    end
  end

  defp validated(%State{validators: vs} = state, url, v), do: %{state | validators: Map.put(vs, url, v)}

  defp opts(), do: HTTP.req_options(proxy_config())

  defp decode_cloud_addon(platform, yaml) do
    with {:ok, addons} when is_list(addons) <- Console.Utils.Yaml.decode(yaml) do
      distro = String.to_existing_atom(platform)
      {:ok, {platform, Utils.map_list(addons, &CloudAddOn.new(&1, distro))}}
    end
  end

  def static() do
    base_path = "static/addons"
    {:ok, yaml} = File.read("#{base_path}/manifest.yaml")
    {:ok, %{"platforms" => [_ | _] = platforms}} = Console.Utils.Yaml.decode(yaml)
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
