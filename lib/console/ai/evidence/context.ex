defmodule Console.AI.Evidence.Context do
  import Console.AI.Evidence.Base, only: [append: 2]

  @type t :: %__MODULE__{history: Console.AI.Provider.history}
  @type result :: {:ok, Console.AI.Provider.history, %{evidence: [map]}} |
                  {:ok, Console.AI.Provider.history} |
                  {:error, any}

  defstruct [:history, evidence: []]

  def from_result({:ok, history, %{evidence: evidence}}),
    do: {:ok, %__MODULE__{history: history, evidence: evidence}}
  def from_result({:ok, history}), do: {:ok, new(history)}
  def from_result(error), do: error

  def new(%__MODULE__{} = ctx), do: ctx
  def new(history), do: %__MODULE__{history: history}

  def evidence(%__MODULE__{} = ctx, %{} = e) when map_size(e) > 0, do: %{ctx | evidence: [e | ctx.evidence]}
  def evidence(%__MODULE__{} = ctx, [_ | _] = es), do: %{ctx | evidence: ctx.evidence ++ es}
  def evidence(%__MODULE__{} = ctx, _), do: ctx

  def claims(%__MODULE__{} = ctx, %{evidence: [_ | _] = evidence}), do: evidence(ctx, evidence)
  def claims(%__MODULE__{} = ctx, _), do: ctx

  def prompt(ctx, {_, nil}), do: ctx
  def prompt(%__MODULE__{history: hist} = ctx, msg), do: %{ctx | history: append(hist, msg)}

  def reduce(%__MODULE__{} = ctx, enum, fun) when is_function(fun, 2), do: Enum.reduce(enum, ctx, fun)

  @spec result(t) :: result
  def result(%__MODULE__{history: history, evidence: evidence}), do: {:ok, history, %{evidence: evidence}}

  def merge(%__MODULE__{history: h1, evidence: e1} = ctx, %__MODULE__{history: h2, evidence: e2}) do
    %{ctx | history: h1 ++ h2, evidence: e1 ++ e2}
  end
  def merge(%__MODULE__{history: hist} = ctx, messages) when is_list(messages) do
    %{ctx | history: hist ++ messages}
  end
  def merge(%__MODULE__{} = ctx, _), do: ctx

  def history(%__MODULE__{history: history}), do: history
  def history(%__MODULE__{} = ctx), do: ctx.history
end
