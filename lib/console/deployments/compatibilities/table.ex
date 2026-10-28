defmodule Console.Deployments.Compatibilities.Table do
  use GenServer
  import Console.Deployments.Ecto.Validations, only: [clean_version: 1]
  import Console.Deployments.Compatibilities.Utils, only: [proxy_config: 0]
  alias Console.Deployments.{Compatibilities.AddOn, Static}
  alias Console.Schema.{RuntimeService}
  alias ETS.KeyValueSet
  require Logger

  @table :addon_compatibilities
  @poll :timer.hours(6)
  @url "/matrices/compatability/static/compatibilities.yaml"

  defmodule State do
    defstruct [:table, :url, :static, :ready, :validators]
  end

  def start_link(opt \\ :ok) do
    GenServer.start_link(__MODULE__, opt, name: __MODULE__)
  end

  def init(_) do
    :timer.send_interval(@poll, :poll)
    send self(), :poll
    if Console.conf(:initialize) do
      send self(), :custom
      :timer.send_interval(@poll, :custom)
    end

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

  @spec all() :: {:ok, [binary]}
  def all() do
    with {:ok, set} <- KeyValueSet.wrap_existing(@table),
         {:ok, l} <- KeyValueSet.to_list(set) do
      {:ok, Enum.map(l, fn {name, _} -> name end)}
    else
      _ -> {:ok, []}
    end
  end

  def handle_call(:ping, _, state), do: {:reply, state.ready, state}

  def handle_info(:poll, %State{table: table, static: true} = state) do
    table = Enum.reduce(Static.compatibilities(), table, &KeyValueSet.put!(&2, &1.name, &1))
    {:noreply, %{state | table: table, ready: true}}
  end

  def handle_info(:poll, %State{table: table, url: url, validators: prev} = state) do
    case Console.safely(fn -> fetch_addons(url, prev) end, fn err -> {:error, err} end) do
      {:ok, :unchanged, validators} ->
        {:noreply, %{state | ready: true, validators: validators}}
      {:ok, [_ | _] = addons, validators} ->
        table = Enum.reduce(addons, table, fn
          %{"name" => name} = addon, table when is_binary(name) -> KeyValueSet.put!(table, name, AddOn.new(addon))
          addon, table ->
            Logger.warning "skipping malformed addon entry #{inspect(addon, limit: 5)}"
            table
        end)
        {:noreply, %{state | table: table, ready: true, validators: validators}}
      err ->
        Logger.error "failed to fetch kubernetes addon manifest: #{inspect(err)}"
        {:noreply, state}
    end
  end

  def handle_info(:custom, %State{table: table} = state) do
    Console.Deployments.Clusters.compatibility_matrices()
    |> Enum.map(&Console.Schema.CustomCompatibilityMatrix.convert/1)
    |> Enum.reduce(table, &KeyValueSet.put!(&2, &1.name, &1))
    |> then(& {:noreply, %{state | table: &1}})
  end

  # validators are only kept once the body decodes, so a bad manifest is
  # refetched on the next poll rather than skipped as unchanged
  defp fetch_addons(url, prev) do
    opts = Console.Utils.HTTP.req_options(proxy_config())
    with {:ok, body, validators} when is_binary(body) <- Console.Utils.HTTP.fetch_if_changed(url, prev, opts),
         {:ok, %{"addons" => addons}} <- Console.Utils.Yaml.decode(body) do
      {:ok, addons, validators}
    end
  end

  def static() do
    base_path = "static/compatibilities"
    {:ok, yaml} = File.read("#{base_path}/manifest.yaml")
    {:ok, %{"names" => [_ | _] = addons}} = Console.Utils.Yaml.decode(yaml)
    Enum.map(addons, fn name ->
      {:ok, yaml} = File.read("#{base_path}/#{name}.yaml")
      {:ok, %{} = addon} = Console.Utils.Yaml.decode(yaml)
      %{AddOn.new(addon) | name: name}
    end)
  end
end
