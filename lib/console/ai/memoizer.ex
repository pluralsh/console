defmodule Console.AI.Memoizer do
  import Console.AI.Evidence.Base, only: [append: 2]
  alias Console.Repo
  alias Console.AI.{Evidence, Provider, Tool}
  alias Console.Schema.{Service, AiInsight, Stack, Cluster, ClusterInsightComponent, ServiceComponent}

  @format {:user, """
  Please format the result in the following way using markdown:

  # Summary

  {one paragraph summary of the issue described}

  # Root Cause

  {one paragraph summary of the root cause of the issue being faced}

  # Key Evidence

  {numbered list of supporting evidence for this root cause}

  # Contextual Observations

  {bulleted list of contextual information that also could be helpful}

  # Debugging Steps

  {suggestions for how to debug the issue}
  """}

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

  defp insight_attrs(%{insight_id: id} = model, history, attrs, sha) do
    history = if Evidence.custom(model), do: history, else: append(history, @format)
    with {:ok, insight} <- Provider.completion(history),
         {:ok, summary} <- Provider.summary(insight) do
      %{
        ai_poll_at: next_poll_at(),
        insight: Map.merge(attrs, %{id: id, force: false, text: insight, summary: summary, errors: [], sha: sha})
      }
    else
      {:error, error} ->
        %{insight: %{id: id, errors: [%{source: "ai", error: error}], sha: sha}, ai_poll_at: next_poll_at()}
    end
  end

  defp gen_error(%schema{} = model, error) do
    schema.changeset(model, %{
      ai_poll_at: next_poll_at(),
      insight: %{errors: [%{source: "evidence", message: error}]}
    })
    |> Repo.update()
  end

  defp sha(history) do
    :erlang.phash2(history)
    |> Integer.to_string(16)
    |> String.downcase()
  end

  @poll_duration 10 * 60 # 10 minutes

  defp next_poll_at() do
    duration = Duration.new!(second: @poll_duration + Console.jitter(floor(@poll_duration / 2)))
    DateTime.shift(DateTime.utc_now(), duration)
  end
end
