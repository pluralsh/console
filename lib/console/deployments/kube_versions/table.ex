defmodule Console.Deployments.KubeVersions.Table do
  use GenServer
  import Console.Deployments.Compatibilities.Utils, only: [later?: 2]
  alias Console.Deployments.Static
  alias Console.Deployments.KubeVersions.Changelog
  alias ETS.KeyValueSet
  require Logger

  @distros ~w(eks aks gke)a

  @table :extended_kube_versions
  @changelog_url "/matrices/compatability/static/kube_changelog.yaml"
  @poll :timer.minutes(60)

  defmodule State do
    defstruct [:table, :url, :static]
  end

  defmodule Entry do
    defstruct [:distro, versions: []]
  end

  defmodule Version do
    @type t :: %__MODULE__{version: binary, extended: boolean}

    defstruct [:version, :extended, :extended_from]

    def new(attrs) do
      %__MODULE__{
        version: attrs["version"],
        extended: attrs["extended"],
        extended_from: parse_date(attrs["extended_from"])
      }
    end

    defp parse_date(from) when is_binary(from) do
      with {:ok, ts} <- Timex.parse(from, "{YYYY}-{0M}-{0D}"),
           %DateTime{} = datetime <- Timex.to_datetime(ts) do
        datetime
      else
        _ -> nil
      end
    end
    defp parse_date(_), do: nil
  end

  @type distro :: :eks | :aks | :gke
  @type entry :: %Entry{distro: distro, versions: [Version.t]}

  @doc """
  Fetch the changelog for a given kubernetesversion.
  """
  @spec changelog(binary) :: Changelog.t | nil
  def changelog(version) do
    with {:ok, set} <- KeyValueSet.wrap_existing(@table),
      do: set[{:changelog, version}]
  end

  @spec fetch(distro) :: [Version.t]
  def fetch(distro) when distro in @distros do
    with {:ok, set} <- KeyValueSet.wrap_existing(@table),
         %Entry{versions: vsns} <- set[distro] do
      vsns
    else
      _ -> []
    end
  end
  def fetch(_), do: fetch(:gke)

  @spec fetch_strict(distro) :: [Version.t]
  def fetch_strict(distro) when distro in @distros,
    do: fetch(distro)
  def fetch_strict(_), do: []

  @spec extended_versions() :: %{distro => binary | nil}
  def extended_versions() do
    Map.new(@distros, fn distro ->
      with [_ | _] = versions <- fetch(distro),
           %Version{version: v} <- Enum.find(versions, & &1.extended) do
        {distro, v}
      else
        _ -> {distro, nil}
      end
    end)
  end

  @spec compliant_versions() :: %{distro => binary | nil}
  def compliant_versions() do
    Map.new(@distros, fn distro ->
      with [_ | _] = versions <- fetch(distro),
           %Version{version: v} <- Enum.find(Enum.reverse(versions), & !&1.extended) do
        {distro, v}
      else
        _ -> {distro, nil}
      end
    end)
  end


  def info(distro, version) do
    with [_ | _] = versions <- fetch_strict(distro),
         %Version{} = vsn <- Enum.find(versions, &later?(version, &1.version)) do
      vsn
    else
      _ -> nil
    end
  end

  @spec extended?(distro, binary) :: boolean
  def extended?(distro, version) when is_binary(version) do
    with [_ | _] = versions <- fetch(distro),
         %Version{extended: xt} <- Enum.find(versions, &later?(version, &1.version)) do
      !!xt
    else
      _ -> false
    end
  end
  def extended?(_, _), do: false


  def start_link(opt \\ :ok) do
    GenServer.start_link(__MODULE__, opt, name: __MODULE__)
  end

  def init(_) do
    :timer.send_interval(@poll, :poll)
    # send self(), :poll
    {:ok, table} = KeyValueSet.new(name: @table, read_concurrency: true, ordered: true)
    table = Enum.reduce(Static.versions(), table, &KeyValueSet.put!(&2, &1.distro, &1))
    table = Enum.reduce(Static.changelog(), table, &KeyValueSet.put!(&2, {:changelog, &1.version}, &1))
    {:ok, %State{table: table, static: Console.conf(:airgap), url: Console.plrl_assets_url(@changelog_url)}}
  end

  def handle_info(:poll, %State{table: table, static: false, url: url} = state) do
    with {:ok, %HTTPoison.Response{status_code: 200, body: body}} <- HTTPoison.get(url),
         {:ok, %{"kube_changelog" => changelog}} <- YamlElixir.read_from_string(body) do
      table = Enum.reduce(changelog, table, fn change, table ->
        changelog = Changelog.new(change)
        KeyValueSet.put!(table, {:changelog, changelog.version}, changelog)
      end)
      {:noreply, %{state | table: table}}
    else
      err ->
        Logger.error "failed to fetch kubernetes changelog: #{inspect(err)}"
        {:noreply, state}
    end
  end
  def handle_info(:poll, state), do: {:noreply, state}

  defp to_entry(distro, versions) do
    %Entry{
      distro: distro,
      versions: Enum.map(versions, &Version.new/1)
    }
  end

  def static() do
    Enum.map(@distros, fn distro ->
      {:ok, yaml} = File.read("static/extended/#{distro}.yaml")
      {:ok, versions} = YamlElixir.read_from_string(yaml)
      to_entry(distro, versions)
    end)
  end

  def static_changelog() do
    {:ok, yaml} = File.read("static/kube_changelog.yaml")
    {:ok, %{"kube_changelog" => changelog}} = YamlElixir.read_from_string(yaml)
    Enum.map(changelog, &Changelog.new/1)
  end
end
