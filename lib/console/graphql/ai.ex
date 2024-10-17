defmodule Console.GraphQl.AI do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.AI

  @desc "A representation of a LLM-derived insight"
  object :ai_insight do
    field :sha,     :string, description: "a deduplication sha for this insight"
    field :text,    :string, description: "the text of this insight"
    field :summary, :string, description: "a shortish summary of this insight"
    field :error,   list_of(:service_error), description: "any errors generated when compiling this insight"

    timestamps()
  end

  object :ai_queries do
    field :ai_completion, :string do
      middleware Authenticated
      arg :system, non_null(:string), description: "the initial system prompt to use for this completion"
      arg :input,  non_null(:string), description: "the actual user-provided prompt to give to the underlying LLM"

      resolve &AI.ai_completion/2
    end
  end
end
