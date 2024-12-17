defmodule Console.Logs.Line do
  @type t :: %__MODULE__{facets: [%{key: binary, value: binary}]}

  defstruct [:timestamp, :log, :facets]

  def new(map) do
    %__MODULE__{log: map[:log], timestamp: map[:timestamp], facets: map[:facets]}
  end
end
