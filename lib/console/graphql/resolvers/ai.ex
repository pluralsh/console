defmodule Console.GraphQl.Resolvers.AI do
  use Console.GraphQl.Resolvers.Base, model: Console.Schema.AiInsight
  alias Console.Repo
  alias Console.Deployments.Policies

  def ai_completion(%{system: system, input: input}, _) when is_binary(input) do
    Console.AI.Provider.completion([{:user, input}], preface: system)
  end

  def ai_completion(%{system: system, chat: chat}, _) when is_list(chat) do
    Enum.map(chat, fn %{role: r, content: c} -> {r, c} end)
    |> Console.AI.Provider.completion(preface: system)
  end

  def ai_completion(_, _), do: {:error, "need to pass either a raw input or a chat history"}

  def ai_suggested_fix(%{insight_id: id}, %{context: %{current_user: user}}) do
    insight = Repo.get!(AiInsight, id)
              |> Repo.preload([:service, :stack])
    with {:ok, insight} <- Policies.allow(insight, user, :write),
      do: Console.AI.Fixer.fix(insight)
  end
end
