defmodule Console.AI.Evidence.Context do
  import Console.AI.Evidence.Base, only: [append: 2]

  @type t :: %__MODULE__{history: Console.AI.Provider.history}

  defstruct [:history, evidence: []]

  def new(history), do: %__MODULE__{history: history}

  def evidence(%__MODULE__{} = ctx, evidence), do: %{ctx | evidence: [evidence | ctx.evidence]}

  def prompt(%__MODULE__{history: hist} = ctx, msg), do: %{ctx | history: append(hist, msg)}

  def reduce(%__MODULE__{} = ctx, enum, fun) when is_function(fun, 2), do: Enum.reduce(enum, ctx, fun)

  def result(%__MODULE__{history: history, evidence: evidence}), do: {:ok, history, %{evidence: evidence}}
end
