defmodule Console.Deployments.Compatibilities.Reference do
  @type t :: %__MODULE__{}

  defstruct [:name, :version]

  def new(%{} = attrs), do: %__MODULE__{name: attrs["name"], version: attrs["version"]}
  def new(_), do: nil
end

defmodule Console.Deployments.Compatibilities.VersionSummary do
  @type t :: %__MODULE__{helm_changes: binary, features: [binary], breaking_changes: [binary], chart_updates: [binary]}
  defstruct [:helm_changes, :features, :breaking_changes, :chart_updates]

  def new(%{} = attrs) do
    %__MODULE__{
      helm_changes: attrs["helm_changes"],
      features: attrs["features"],
      breaking_changes: attrs["breaking_changes"],
      chart_updates: attrs["chart_updates"]
    }
  end
  def new(_), do: nil
end

defmodule Console.Deployments.Compatibilities.Version do
  alias Console.Deployments.Compatibilities.{Reference, Utils, VersionSummary}

  @type t :: %__MODULE__{requirements: [%Reference{}], incompatibilities: [%Reference{}], summary: VersionSummary.t}

  # semver is `version` parsed once at load (nil when it isn't semver), since
  # version lookups run per runtime service on every cluster query
  defstruct [:version, :kube, :chart_version, :requirements, :incompatibilities, :images, :summary, :semver]

  def blocking?(%__MODULE__{kube: kube_vsns}, kube_version, inc \\ 1),
    do: Utils.blocking?(kube_vsns, kube_version, inc)

  def new(%{} = attrs) do
    prepare(%__MODULE__{
      version: Utils.stringify(attrs["version"]),
      kube: attrs["kube"],
      chart_version: Utils.stringify(attrs["chart_version"]),
      requirements: Utils.map_list(attrs["requirements"], &Reference.new/1),
      incompatibilities: Utils.map_list(attrs["incompatibilities"], &Reference.new/1),
      images: attrs["images"],
      summary: VersionSummary.new(attrs["summary"])
    })
  end

  def prepare(%__MODULE__{version: vsn} = version), do: %{version | semver: Utils.semver(vsn)}
end

defmodule Console.Deployments.Compatibilities.AddOn do
  import Console.Deployments.Ecto.Validations, only: [clean_version: 1]
  alias Console.Deployments.Compatibilities
  alias Console.Deployments.Compatibilities.Utils
  alias Console.Schema.Cluster

  @type t :: %__MODULE__{versions: [%Compatibilities.Version{}]}

  defstruct [:name, :versions, :icon, :git_url, :release_url, :readme_url]

  def new(%{} = attrs) do
    %__MODULE__{
      name: attrs["name"],
      icon: attrs["icon"],
      git_url: attrs["git_url"],
      release_url: attrs["release_url"],
      readme_url: attrs["readme_url"],
      versions: Utils.map_list(attrs["versions"], &Compatibilities.Version.new/1)
    }
  end

  @doc """
  The lowest version newer than `from` that supports the cluster's next kube minor.
  Independent of the order the matrix lists versions in.
  """
  @spec upgrade_version(t(), Cluster.t) :: Compatibilities.Version.t | nil
  def upgrade_version(addon, cluster, from \\ nil)
  def upgrade_version(%__MODULE__{versions: [_ | _] = vsns}, %Cluster{current_version: cv}, from) when is_binary(cv),
    do: Utils.upgrade_candidate(vsns, & &1.kube, cv, from)
  def upgrade_version(_, _, _), do: nil

  @doc """
  The newest version at or below `version`, so a service running between two
  matrix entries resolves to the older one. Independent of list order.
  """
  @spec find_version(t(), binary) :: Compatibilities.Version.t | nil
  def find_version(%__MODULE__{versions: [_ | _] = vsns}, version) when is_binary(version) do
    with {:ok, tgt} <- Version.parse(clean_version(version)) do
      Enum.reduce(vsns, nil, fn vsn, best ->
        with %Version{} = semver <- Utils.semver_of(vsn),
             true <- Version.compare(semver, tgt) != :gt,
             true <- is_nil(best) or Version.compare(semver, elem(best, 0)) == :gt do
          {semver, vsn}
        else
          _ -> best
        end
      end)
      |> case do
        {_, vsn} -> vsn
        nil -> nil
      end
    else
      _ -> nil
    end
  end
  def find_version(_, _), do: nil
end

defmodule Console.Deployments.Compatibilities.CloudAddOn do
  alias Console.Deployments.Compatibilities.Utils
  alias Console.Schema.Cluster

  defstruct [:name, :versions, :publisher, :distro]

  defmodule Version do
    alias Console.Deployments.Compatibilities.Utils
    @type t :: %__MODULE__{}
    defstruct [:version, :compatibilities]

    def blocking?(%__MODULE__{compatibilities: kube_vsns}, kube_vsn, inc \\ 1),
      do: Utils.blocking?(kube_vsns, kube_vsn, inc)
  end

  @type t :: %__MODULE__{versions: [Version.t]}

  def new(%{} = attrs, distro) do
    %__MODULE__{
      name: attrs["name"],
      publisher: attrs["publisher"],
      distro: distro,
      versions: Utils.map_list(attrs["versions"], &%Version{
        version: Utils.stringify(&1["version"]),
        compatibilities: &1["compatibilities"]
      })
    }
  end

  @spec upgrade_version(t(), Cluster.t) :: Version.t | nil
  def upgrade_version(addon, cluster, from \\ nil)
  def upgrade_version(%__MODULE__{versions: [_ | _] = vsns}, %Cluster{current_version: cv}, from) when is_binary(cv),
    do: Utils.upgrade_candidate(vsns, & &1.compatibilities, cv, from)
  def upgrade_version(_, _, _), do: nil

  def find_version(%__MODULE__{versions: vsns}, vsn) when is_list(vsns),
    do: Enum.find(vsns, & &1.version == vsn)
  def find_version(_, _), do: nil
end
