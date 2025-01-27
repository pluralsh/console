defmodule Console.Deployments.Compatibilities.Reference do
  @type t :: %__MODULE__{}

  defstruct [:name, :version]
end

defmodule Console.Deployments.Compatibilities.Version do
  alias Console.Deployments.Compatibilities.{Reference, Utils}

  @type t :: %__MODULE__{requirements: [%Reference{}], incompatibilities: [%Reference{}]}

  defstruct [:version, :kube, :chart_version, :requirements, :incompatibilities]

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

  @type t :: %__MODULE__{versions: [%Compatibilities.Version{}]}

  defstruct [:name, :versions, :icon, :git_url, :release_url, :readme_url]

  def spec() do
    %__MODULE__{
      versions: [Compatibilities.Version.spec()]
    }
  end

  def find_version(%__MODULE__{versions: [_ | _] = vsns}, version) do
    case Version.parse(version) do
      {:ok, v} -> find_version(Enum.reverse(vsns), v)
      _ -> nil
    end
  end

  def find_version([%{version: version} = found | _], version), do: found
  def find_version([%{version: version} = found], tgt) do
    with {:ok, vsn} <- Version.parse(version),
         :gt <- Version.compare(tgt, vsn) do
      found
    else
      _ -> nil
    end
  end

  def find_version([%{version: first} = v1, %{version: second} = v2 | rest], version) when is_binary(first) and is_binary(second) do
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
      _ -> find_version([v2 | rest], version)
    end
  end
  def find_version(_, _), do: nil
end

defmodule Console.Deployments.Compatibilities.CloudAddOn do

  defstruct [:name, :versions, :publisher]

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

  def find_version(%__MODULE__{versions: vsns}, vsn) when is_list(vsns),
    do: Enum.find(vsns, & &1.version == vsn)
  def find_version(_, _), do: nil
end
