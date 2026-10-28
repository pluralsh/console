defmodule Console.Deployments.Deprecations.Table do
  use GenServer
  import Console.Deployments.Compatibilities.Utils, only: [proxy_config: 0]
  alias Console.Deployments.Compatibilities.Utils
  alias Console.Schema.ServiceComponent
  alias Console.Deployments.Static
  alias ETS.KeyValueSet
  require Logger

  @table :api_deprecations
  @poll :timer.minutes(60)
  @url "/matrices/compatability/static/versions.yml"


  defmodule State do
    defstruct [:table, :url, :static, :validators]
  end

  defmodule Entry do
    # deprecated/removed are the kube {major, minor} of deprecated_in/removed_in,
    # parsed once at load (nil when missing or not semver). Deprecations are per
    # minor, and comparing whole versions would rank a provider build like
    # 1.25.0-eks-abc below 1.25.0.
    defstruct [:group, :version, :kind, :deprecated_in, :removed_in, :replacement, :available_in, :component, :deprecated, :removed]
  end

  def name(%{group: g, version: v, kind: k}), do: "#{g}/#{v}.#{k}"

  def start_link(opt \\ :ok) do
    GenServer.start_link(__MODULE__, opt, name: __MODULE__)
  end

  def init(_) do
    :timer.send_interval(@poll, :poll)
    send self(), :poll
    {:ok, table} = KeyValueSet.new(name: @table, read_concurrency: true, ordered: true)
    table = Enum.reduce(Static.deprecations(), table, &KeyValueSet.put!(&2, name(&1), &1))
    {:ok, %State{table: table, url: Console.plrl_assets_url(@url), static: Console.conf(:airgap)}}
  end

  def fetch(%ServiceComponent{} = component) do
    case KeyValueSet.wrap_existing(@table) do
      {:ok, set} -> set[name(component)]
      _ -> nil
    end
  end

  def handle_info(:poll, %State{table: table, static: true} = state) do
    table = Enum.reduce(Static.deprecations(), table, &KeyValueSet.put!(&2, name(&1), &1))
    {:noreply, %{state | table: table}}
  end

  def handle_info(:poll, %State{table: table, url: url, validators: prev} = state) do
    case Console.safely(fn -> fetch_and_parse(url, prev) end, fn err -> {:error, err} end) do
      {:ok, :unchanged, validators} -> {:noreply, %{state | validators: validators}}
      {:ok, [_ | _] = entries, validators} ->
        table = Enum.reduce(entries, table, &KeyValueSet.put!(&2, name(&1), &1))
        {:noreply, %{state | table: table, validators: validators}}
      err ->
        Logger.error "failed to fetch kubernetes deprecation table: #{inspect(err)}"
        {:noreply, state}
    end
  end

  # validators are only kept once the body decodes, so a bad file is refetched
  # on the next poll rather than skipped as unchanged
  defp fetch_and_parse(url, prev) do
    opts = Console.Utils.HTTP.req_options(proxy_config())
    with {:ok, body, validators} when is_binary(body) <- Console.Utils.HTTP.fetch_if_changed(url, prev, opts),
         {:ok, %{"deprecated-versions" => deprecated}} <- Console.Utils.Yaml.decode(body) do
      {:ok, entries(deprecated), validators}
    end
  end

  defp entries(deprecated) when is_list(deprecated), do: for(%{"version" => gv} = e <- deprecated, is_binary(gv), do: to_entry(e))
  defp entries(_), do: []

  defp to_entry(%{"version" => gv} = entry) do
    {group, version} = split(gv)
    %Entry{
      group: group,
      version: version,
      kind: entry["kind"],
      deprecated_in: entry["deprecated-in"],
      removed_in: entry["removed-in"],
      replacement: entry["replacement-api"],
      available_in: entry["replacement-available-in"] || entry["available-in"],
      component: entry["component"],
      deprecated: minor(entry["deprecated-in"]),
      removed: minor(entry["removed-in"])
    }
  end

  defp split(gv) do
    case String.split(gv, "/", parts: 2) do
      [g, v] -> {g, v}
      [v] -> {"core", v}
    end
  end

  @type minor :: {non_neg_integer, non_neg_integer}

  @doc "the kube {major, minor} of a version string, nil when it isn't semver"
  @spec minor(term) :: minor | nil
  def minor(vsn) do
    case Utils.semver(vsn) do
      %Version{major: maj, minor: min} -> {maj, min}
      _ -> nil
    end
  end

  def static() do
    {:ok, yaml} = File.read("static/versions.yml")
    {:ok, %{"deprecated-versions" => [_ | _] = deprecated}} = Console.Utils.Yaml.decode(yaml)
    entries(deprecated)
  end
end
