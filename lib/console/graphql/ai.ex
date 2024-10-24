defmodule Console.GraphQl.AI do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.AI

  @desc "A role to pass to an LLM, modeled after OpenAI's chat api roles"
  enum :ai_role do
    value :system
    value :assistant
    value :user
  end

  @desc "enumerable to describe the recency of this insight"
  enum :insight_freshness do
    value :fresh
    value :stale
    value :expired
  end

  @desc "A basic AI chat message input, modeled after OpenAI's api model"
  input_object :chat_message do
    field :role,    non_null(:ai_role)
    field :content, non_null(:string)
  end

  @desc "A representation of a LLM-derived insight"
  object :ai_insight do
    field :sha,       :string, description: "a deduplication sha for this insight"
    field :text,      :string, description: "the text of this insight"
    field :summary,   :string, description: "a shortish summary of this insight"
    field :freshness, :insight_freshness, resolve: fn insight, _, _ -> {:ok, Console.Schema.AiInsight.freshness(insight)} end
    field :error,     list_of(:service_error), description: "any errors generated when compiling this insight"

    timestamps()
  end

  object :ai_queries do
    @desc "General api to query the configured LLM for your console"
    field :ai_completion, :string do
      middleware Authenticated
      arg :system, non_null(:string), description: "the initial system prompt to use for this completion"
      arg :input,  :string, description: "the actual user-provided prompt to give to the underlying LLM"
      arg :chat,   list_of(:chat_message), description: "a list of chat prompts to give to the llm"

      resolve &AI.ai_completion/2
    end

    @desc "Use the content of an insight and additional context from its associated object to suggest a fix"
    field :ai_suggested_fix, :string do
      middleware Authenticated
      arg :insight_id, non_null(:id), description: "the ai insight you want to suggest a fix for"

      resolve &AI.ai_suggested_fix/2
    end
  end
end
