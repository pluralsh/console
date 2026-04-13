defmodule Console.Logs.AggregationBucket do
  @derive Jason.Encoder

  @type t :: %__MODULE__{timestamp: DateTime.t(), count: non_neg_integer()}

  defstruct [:timestamp, :count]
end
