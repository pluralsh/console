defmodule Console.Deployments.Compatibilities.Reference do
  @type t :: %__MODULE__{}

  defstruct [:name, :version]
end

defmodule Console.Deployments.Compatibilities.Version do
  alias Console.Deployments.Compatibilities.Reference

  @type t :: %__MODULE__{requirements: [%Reference{}], incompatibilities: [%Reference{}]}

  defstruct [:version, :kube, :requirements, :incompatibilities]

  def spec() do
    %__MODULE__{
      requirements: [%Reference{}],
      incompatibilities: [%Reference{}]
    }
  end
end

defmodule Console.Deployments.Compatibilities.AddOn do
  alias Console.Deployments.Compatibilities.Version
  @type t :: %__MODULE__{versions: [%Version{}]}

  defstruct [:versions]

  def spec() do
    %__MODULE__{
      versions: [Version.spec()]
    }
  end
end
