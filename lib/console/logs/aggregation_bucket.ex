defmodule Console.Logs.AggregationBucket do
  @derive Jason.Encoder

  @type t :: %__MODULE__{timestamp: DateTime.t(), count: non_neg_integer(), level: Console.Logs.Level.t() | nil}

  defstruct [:timestamp, :count, :level]
end
