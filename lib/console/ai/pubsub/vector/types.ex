defmodule Console.AI.PubSub.Vector.Indexable do
  @type t :: %__MODULE__{data: any, filters: keyword | nil}
  defstruct [:data, :filters]
end
