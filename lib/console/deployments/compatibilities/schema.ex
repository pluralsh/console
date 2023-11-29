defmodule Console.Deployments.Compatibilities.Reference do
  @type t :: %__MODULE__{}

  defstruct [:name, :version]
end

defmodule Console.Deployments.Compatibilities.Version do
  import Console.Deployments.Ecto.Validations, only: [clean_version: 1]
  alias Console.Deployments.Compatibilities.Reference

  @type t :: %__MODULE__{requirements: [%Reference{}], incompatibilities: [%Reference{}]}

  defstruct [:version, :kube, :requirements, :incompatibilities]

  def blocking?(%__MODULE__{kube: kube_vsns}, kube_version) do
    with {:ok, %{major: maj, minor: min}} <- Version.parse(clean_version(kube_version)) do
      kube_vsns = Enum.map(kube_vsns, &clean_version/1)
      Enum.all?(kube_vsns, fn kube ->
        case Version.parse(kube) do
          {:ok, %{major: ^maj, minor: ^min}} -> false
          _ -> true
        end
      end)
    else
      _ -> true
    end
  end

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

  defstruct [:versions, :icon]

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
  def find_version([%{version: version} = found], %{major: m, minor: minor}) do
    clean_version(version)
    |> Version.parse()
    |> case do
      {:ok, %{major: ^m, minor: ^minor}} -> found
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
