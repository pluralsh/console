defmodule Console.Deployments.Compatibilities.Reference do
  @type t :: %__MODULE__{}

  defstruct [:name, :version]
end

defmodule Console.Deployments.Compatibilities.Version do
  alias Console.Deployments.Compatibilities.{Reference, Utils}

  @type t :: %__MODULE__{requirements: [%Reference{}], incompatibilities: [%Reference{}]}

  defstruct [:version, :kube, :chart_version, :requirements, :incompatibilities, :images]

  def blocking?(%__MODULE__{kube: kube_vsns}, kube_version, inc \\ 1),
    do: Utils.blocking?(kube_vsns, kube_version, inc)

  def spec() do
    %__MODULE__{
      requirements: [%Reference{}],
      incompatibilities: [%Reference{}]
    }
  end
end

defmodule Console.Deployments.Compatibilities.AddOn do
  import Console.Deployments.Ecto.Validations, only: [clean_version: 1]
  alias Console.Deployments.Compatibilities
  alias Console.Schema.Cluster

  @type t :: %__MODULE__{versions: [%Compatibilities.Version{}]}

  defstruct [:name, :versions, :icon, :git_url, :release_url, :readme_url]

  def spec() do
    %__MODULE__{
      versions: [Compatibilities.Version.spec()]
    }
  end

  @spec upgrade_version(t(), Cluster.t) :: Compatibilities.Version.t | nil
  def upgrade_version(%__MODULE__{versions: [_ | _] = vsns}, %Cluster{current_version: cv}) when is_binary(cv) do
    cleaned = clean_version(cv)
    with {:ok, %Version{major: maj, minor: min}} <- Version.parse(cleaned) do
      Enum.reverse(vsns)
      |> Enum.find(fn
        %Compatibilities.Version{kube: [_ | _] = kube} -> Enum.member?(kube, "#{maj}.#{min + 1}")
        _ -> false
      end)
    else
      _ -> nil
    end
  end
  def upgrade_version(_, _), do: nil

  def find_version(%__MODULE__{versions: [_ | _] = vsns}, version) do
    cleaned = clean_version(version)
    case Version.parse(cleaned) do
      {:ok, v} -> find_version(Enum.reverse(vsns), v, cleaned)
      _ -> nil
    end
  end

  def find_version([%{version: version} = found | _], _, version), do: found
  def find_version([%{version: version} = found], tgt, _) do
    with {:ok, vsn} <- Version.parse(version),
         :gt <- Version.compare(tgt, vsn) do
      found
    else
      _ -> nil
    end
  end

  def find_version([%{version: first} = v1, %{version: second} = v2 | rest], version, cleaned)
      when is_binary(first) and is_binary(second) do
    first  = clean_version(first)
    second = clean_version(second)

    with {:ok, first} <- Version.parse(first),
         {:ok, second} <- Version.parse(second),
         {:v2, :lt} <- {:v2, Version.compare(version, second)},
         {:v1, :gt} <- {:v1, Version.compare(version, first)} do
      v1
    else
      {:v2, :eq} -> v2
      {:v1, :eq} -> v1
      _ -> find_version([v2 | rest], version, cleaned)
    end
  end
  def find_version([_ | rest], version, cleaned), do: find_version(rest, version, cleaned)
  def find_version(_, _, _), do: nil
end

defmodule Console.Deployments.Compatibilities.CloudAddOn do
  import Console.Deployments.Ecto.Validations, only: [clean_version: 1]
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

  def spec() do
    %__MODULE__{versions: [%Version{}]}
  end

  @spec upgrade_version(t(), Cluster.t) :: Version.t | nil
  def upgrade_version(%__MODULE__{versions: [_ | _] = vsns}, %Cluster{current_version: cv}) when is_binary(cv) do
    cleaned = clean_version(cv)
    with {:ok, %Elixir.Version{major: maj, minor: min}} <- Elixir.Version.parse(cleaned) do
      Enum.reverse(vsns)
      |> Enum.find(fn
        %Version{compatibilities: [_ | _] = kube} -> Enum.member?(kube, "#{maj}.#{min + 1}")
        _ -> false
      end)
    else
      _ -> nil
    end
  end
  def upgrade_version(_, _), do: nil

  def find_version(%__MODULE__{versions: vsns}, vsn) when is_list(vsns),
    do: Enum.find(vsns, & &1.version == vsn)
  def find_version(_, _), do: nil
end
