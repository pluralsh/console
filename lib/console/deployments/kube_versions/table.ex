defmodule Console.Deployments.KubeVersions.Table do
  use GenServer
  import Console.Deployments.Compatibilities.Utils, only: [later?: 2]
  alias Console.Deployments.Static
  alias ETS.KeyValueSet
  require Logger

  @distros ~w(eks aks gke)a

  @table :extended_kube_versions
  @poll :timer.minutes(60)

  defmodule State do
    defstruct [:table, :url, :static]
  end

  defmodule Entry do
    defstruct [:distro, versions: []]
  end

  defmodule Version do
    @type t :: %__MODULE__{version: binary, extended: boolean}

    defstruct [:version, :extended]

    def new(attrs) do
      %__MODULE__{version: attrs["version"], extended: attrs["extended"]}
    end
  end

  @type distro :: :eks | :aks | :gke
  @type entry :: %Entry{distro: distro, versions: [Version.t]}

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

  @spec extended?(distro, binary) :: boolean
  def extended?(distro, version) do
    with [_ | _] = versions <- fetch(distro),
         %Version{extended: xt} <- Enum.find(versions, &later?(version, &1.version)) do
      !!xt
    else
      _ -> false
    end
  end

  def start_link(opt \\ :ok) do
    GenServer.start_link(__MODULE__, opt, name: __MODULE__)
  end

  def init(_) do
    :timer.send_interval(@poll, :poll)
    # send self(), :poll
    {:ok, table} = KeyValueSet.new(name: @table, read_concurrency: true, ordered: true)
    table = Enum.reduce(Static.versions(), table, &KeyValueSet.put!(&2, &1.distro, &1))
    {:ok, %State{table: table, static: Console.conf(:airgap)}}
  end

  def handle_info(:poll, %State{} = state), do: {:noreply, state}

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
end
