defmodule Console.AI.Memoizer do
  import Console.AI.Evidence.Base, only: [append: 2]
  alias Console.Repo
  alias Console.AI.{Evidence, Provider}
  alias Console.Schema.AiInsight

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
    model = Evidence.preload(model)
    insight = Evidence.insight(model)
    case AiInsight.memoized?(insight, nil) do
      true -> {:ok, insight}
      false -> try_generate(model, insight)
    end
  end

  defp try_generate(model, insight) do
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

  defp persist(%schema{} = model, history, attrs, sha) do
    model
    |> schema.changeset(insight_attrs(model, history, attrs, sha))
    |> Repo.update()
    |> case do
      {:ok, %{insight: insight}} -> {:ok, insight}
      {:error, _} -> {:error, "failed to persist insight to db"}
    end
  end

  defp insight_attrs(%{insight_id: id} = model, history, attrs, sha) do
    history = if Evidence.custom(model), do: history, else: append(history, @format)
    with {:ok, insight} <- Provider.completion(history),
         {:ok, summary} <- Provider.summary(insight) do
      %{insight: Map.merge(attrs, %{id: id, text: insight, summary: summary, errors: [], sha: sha})}
    else
      {:error, error} ->
        %{insight: %{id: id, errors: [%{source: "ai", error: error}], sha: sha}}
    end
  end

  defp gen_error(%schema{} = model, error) do
    schema.changeset(model, %{insight: %{errors: [%{source: "evidence", message: error}]}})
    |> Repo.update()
  end

  defp sha(history) do
    :erlang.phash2(history)
    |> Integer.to_string(16)
    |> String.downcase()
  end
end
