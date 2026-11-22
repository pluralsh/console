defmodule Console.Prom.Tokens do
  @moduledoc """
  Counts the LLM tokens flowing through Plural into the `plrl_ai_tokens_total` counter, tagged by:

  * `source`: `console` (Plural's own AI calls), `agent_run` or `devbox`
  * `agent`: the agent runtime or devbox agent, when known
  * `model`: the model, when known
  * `type`: `input`, `output`, `cached` or `reasoning`, as the provider reports them.  `cached` is usually part
    of `input` and `reasoning` part of `output`, so sum `input` and `output` for a total.

  Token rates are `rate()` over it, eg. tokens per minute by source:

      sum by (source) (rate(plrl_ai_tokens_total{type=~"input|output"}[5m])) * 60
  """
  import Console.Prom.Plugin, only: [metric_scope: 1]

  @types ~w(input output cached reasoning)a

  def types(), do: @types

  @doc """
  Records the tokens of a single LLM call.
  """
  @spec record(map | nil, map) :: :ok
  def record(usage, tags), do: record_delta(usage, %{}, tags)

  @doc """
  Records the growth of a cumulative usage (eg. an agent run's or devbox session's running total) since `prior`.
  """
  @spec record_delta(map | nil, map | nil, map) :: :ok
  def record_delta(usage, prior, tags) when is_map(usage) do
    tags = Map.merge(%{source: "console", agent: "", model: ""}, Map.new(tags, fn {k, v} -> {k, to_string(v || "")} end))
    Enum.each(@types, fn type ->
      case count(usage, type) - count(prior, type) do
        delta when delta > 0 -> :telemetry.execute(metric_scope(:ai_tokens), %{count: delta}, Map.put(tags, :type, Atom.to_string(type)))
        _ -> :ok
      end
    end)
  end
  def record_delta(_, _, _), do: :ok

  defp count(%{} = usage, type) do
    case Map.get(usage, :"#{type}_tokens") do
      n when is_integer(n) -> n
      _ -> 0
    end
  end
  defp count(_, _), do: 0
end
