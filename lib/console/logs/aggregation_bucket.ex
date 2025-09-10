defmodule Console.Logs.AggregationBucket do
  defstruct [:timestamp, :count]

  @type t :: %__MODULE__{timestamp: DateTime.t(), count: non_neg_integer()}

end
