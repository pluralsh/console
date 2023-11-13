defmodule Console.Deployments.AddOnConfig do
  defmodule Condition, do: defstruct [:field, :operation, :value]

  @type t :: %__MODULE__{condition: %Condition{}}

  defstruct [:name, :documentation, :type, :values, :condition]

  def spec() do
    %__MODULE__{condition: %Condition{}}
  end
end

defmodule Console.Deployments.AddOn do
  alias Console.Deployments.AddOnConfig

  @type t :: %__MODULE__{configuration: [AddOnConfig.t]}

  defstruct [:name, :description, :icon, :global, :configuration, version: "0.1.0"]

  def spec() do
    %__MODULE__{
      configuration: [AddOnConfig.spec()]
    }
  end
end
