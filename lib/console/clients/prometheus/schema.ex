defmodule Prometheus.Data, do: defstruct [:resultType, :result]
defmodule Prometheus.Result, do: defstruct [:metric, :values, :value]

defmodule Prometheus.Response do
  alias Prometheus.{Data, Result}

  defstruct [:status, :data]

  def spec() do
    %__MODULE__{data: %Data{result: [%Result{}]}}
  end
end
