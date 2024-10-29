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

  object :chat do
    field :id,      non_null(:id)
    field :role,    non_null(:ai_role)
    field :content, non_null(:string)
    field :seq,     non_null(:integer)

    timestamps()
  end

  connection node_type: :chat

  @desc "A representation of a LLM-derived insight"
  object :ai_insight do
    field :id,        non_null(:id)
    field :sha,       :string, description: "a deduplication sha for this insight"
    field :text,      :string, description: "the text of this insight"
    field :summary,   :string, description: "a shortish summary of this insight"
    field :freshness, :insight_freshness, resolve: fn insight, _, _ -> {:ok, Console.Schema.AiInsight.freshness(insight)} end
    field :error,     list_of(:service_error), description: "any errors generated when compiling this insight"

    timestamps()
  end

  @desc "A kubernetes object used in the course of generating a cluster insight"
  object :cluster_insight_component do
    field :id,        non_null(:id)
    field :group,     :string
    field :version,   non_null(:string)
    field :kind,      non_null(:string)
    field :namespace, :string
    field :name,      non_null(:string)

    @desc "the raw kubernetes resource itself, this is an expensive fetch and should be used sparingly"
    field :resource, :kubernetes_unstructured do
      resolve &AI.raw_resource/3
    end
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

    @desc "gets the chat history from prior AI chat sessions"
    connection field :chats, node_type: :chat do
      middleware Authenticated

      resolve &AI.chats/2
    end

    field :cluster_insight_component, :cluster_insight_component do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &AI.resolve_cluster_insight_component/2
    end
  end

  object :ai_mutations do
    @desc "saves a list of chat messages to your current chat history, can be used at any time"
    field :save_chats, list_of(:chat) do
      middleware Authenticated
      arg :messages, list_of(:chat_message)

      resolve &AI.save_chats/2
    end

    @desc "saves a set of messages and generates a new one transactionally"
    field :chat, :chat do
      middleware Authenticated
      arg :messages, list_of(:chat_message)

      resolve &AI.chat/2
    end

    @desc "Wipes your current chat history blank"
    field :clear_chat_history, :integer do
      middleware Authenticated
      arg :before, :integer, description: "deletes all chats with seq less than or equal to this integer"

      resolve &AI.clear_chats/2
    end

    @desc "deletes a chat from a users history"
    field :delete_chat, :chat do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &AI.delete_chat/2
    end
  end
end
