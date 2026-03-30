defmodule Console.AI.Memoizer do
  alias Console.Repo
  alias Console.AI.{Evidence, Provider, Tool, Chat.Engine, Tools.Insight}
  alias Console.Schema.{Service, AiInsight, Stack, Cluster, ClusterInsightComponent, ServiceComponent}

  @spec generate(struct) :: {:ok, AiInsight.t} | {:error, binary}
  def generate(model) do
    model   = Evidence.preload(model)
    insight = Evidence.insight(model)
    case AiInsight.memoized?(insight, nil) do
      true -> {:ok, insight}
      false -> try_generate(model, insight)
    end
  end

  defp try_generate(model, insight) do
    set_context(model)
    with {:ok, [_ | _] = history, attrs} <- Evidence.generate(model),
         sha <- sha(history),
         false <- AiInsight.memoized?(insight, sha) do
      persist(model, history, attrs, sha)
    else
      {:error, error} ->
        gen_error(model, error)
        {:error, error}
      _ -> {:ok, insight}
    end
  end

  defp set_context(%Service{} = svc), do: Tool.context(service: svc)
  defp set_context(%Stack{} = stack), do: Tool.context(stack: stack)
  defp set_context(%Cluster{} = cluster), do: Tool.context(cluster: cluster)
  defp set_context(%Flow{} = flow), do: Tool.context(flow: flow)
  defp set_context(%ClusterInsightComponent{} = comp), do: Tool.context(cluster: comp.cluster)
  defp set_context(%ServiceComponent{} = comp), do: Tool.context(service: comp.service)
  defp set_context(_), do: :ok

  defp persist(%schema{} = model, history, attrs, sha) do
    model
    |> schema.changeset(insight_attrs(model, history, attrs, sha))
    |> Repo.update(allow_stale: true)
    |> case do
      {:ok, %{insight: insight}} -> {:ok, insight}
      {:error, err} -> {:error, "failed to persist insight to db: #{inspect(err)}"}
    end
  end

  defp insight_attrs(%{insight_id: id}, history, attrs, sha) do
    history = Engine.fit_context_window(history, Provider.system())
    with {:ok, insight} <- Provider.simple_tool_call(history, Insight),
         {:ok, summary} <- Provider.summary(insight) do
      %{
        ai_poll_at: next_poll_at(),
        force_insight: false,
        insight: Map.merge(attrs, %{id: id, force: false, text: insight, summary: summary, errors: [], sha: sha})
      }
    else
      {:error, error} ->
        %{
          insight: %{id: id, errors: [%{source: "ai", error: fmt_error(error)}], sha: sha},
          ai_poll_at: next_poll_at(),
          force_insight: false
        }
    end
  end

  defp gen_error(%schema{} = model, error) do
    schema.changeset(model, %{
      ai_poll_at: next_poll_at(),
      force_insight: false,
      insight: %{errors: [%{source: "evidence", message: fmt_error(error)}]}
    })
    |> Repo.update()
  end

  defp sha(history) do
    :erlang.phash2(history)
    |> Integer.to_string(16)
    |> String.downcase()
  end

  @poll_duration 30 * 60 # 30 minutes

  defp next_poll_at() do
    duration = Duration.new!(second: @poll_duration + Console.jitter(floor(@poll_duration / 2)))
    DateTime.shift(DateTime.utc_now(), duration)
  end

  defp fmt_error(error) when is_binary(error), do: error
  defp fmt_error(error), do: inspect(error)
end
