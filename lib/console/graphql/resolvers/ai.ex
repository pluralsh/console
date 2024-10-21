defmodule Console.GraphQl.Resolvers.AI do
  use Console.GraphQl.Resolvers.Base, model: Console.Schema.Audit

  def ai_completion(%{system: system, input: input}, _) do
    Console.AI.Provider.completion([{:user, input}], preface: system)
  end
end
