defmodule Console.AI.Evidence.Context do
  import Console.AI.Evidence.Base, only: [append: 2]

  @type t :: %__MODULE__{history: Console.AI.Provider.history}

  defstruct [:history, evidence: []]

  def new(%__MODULE__{} = ctx), do: ctx
  def new(history), do: %__MODULE__{history: history}

  def evidence(%__MODULE__{} = ctx, %{} = e) when map_size(e) > 0, do: %{ctx | evidence: [e | ctx.evidence]}
  def evidence(%__MODULE__{} = ctx, [_ | _] = es), do: %{ctx | evidence: ctx.evidence ++ es}
  def evidence(%__MODULE__{} = ctx, _), do: ctx

  def claims(%__MODULE__{} = ctx, %{evidence: [_ | _] = evidence}), do: evidence(ctx, evidence)
  def claims(%__MODULE__{} = ctx, _), do: ctx

  def prompt(%__MODULE__{history: hist} = ctx, msg), do: %{ctx | history: append(hist, msg)}

  def reduce(%__MODULE__{} = ctx, enum, fun) when is_function(fun, 2), do: Enum.reduce(enum, ctx, fun)

  def result(%__MODULE__{history: history, evidence: evidence}), do: {:ok, history, %{evidence: evidence}}
end
