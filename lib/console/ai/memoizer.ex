defmodule Console.AI.Memoizer do
  alias Console.Repo
  alias Console.AI.{Evidence, Provider}
  alias Console.Schema.AiInsight

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
    with {:ok, [_ | _] = history} <- Evidence.generate(model),
         sha <- sha(history),
         false <- AiInsight.memoized?(insight, sha) do
      persist(model, history, sha)
    else
      {:error, error} ->
        gen_error(model, error)
        {:error, error}
      _ -> {:ok, insight}
    end
  end

  defp persist(%schema{} = model, history, sha) do
    attrs = case Provider.completion(history) do
      {:ok, result} ->
        %{insight: %{text: result, errors: [], sha: sha}}
      {:error, error} ->
        %{insight: %{errors: [%{source: "ai", error: error}], sha: sha}}
    end

    schema.changeset(model, attrs)
    |> Repo.update()
    |> case do
      {:ok, %{insight: insight}} -> {:ok, insight}
      {:error, _} -> {:error, "failed to persist insight to db"}
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
