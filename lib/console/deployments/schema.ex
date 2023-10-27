defmodule Console.Deployments.AddOnConfig do
  @type t :: %__MODULE__{}

  defstruct [:name, :documentation, :type]
end

defmodule Console.Deployments.AddOn do
  alias Console.Deployments.AddOnConfig

  @type t :: %__MODULE__{configuration: [AddOnConfig.t]}

  defstruct [:name, :description, :icon, :global, :configuration, version: "0.1.0"]

  def spec() do
    %__MODULE__{
      configuration: [%AddOnConfig{}]
    }
  end
end
