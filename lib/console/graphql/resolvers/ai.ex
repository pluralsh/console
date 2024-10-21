defmodule Console.GraphQl.Resolvers.AI do
  use Console.GraphQl.Resolvers.Base, model: Console.Schema.Audit

  def ai_completion(%{system: system, input: input}, _) when is_binary(input) do
    Console.AI.Provider.completion([{:user, input}], preface: system)
  end

  def ai_completion(%{system: system, chat: chat}, _) when is_list(chat) do
    Enum.map(chat, fn %{role: r, content: c} -> {r, c} end)
    |> Console.AI.Provider.completion(preface: system)
  end

  def ai_completion(_, _), do: {:error, "need to pass either a raw input or a chat history"}
end
