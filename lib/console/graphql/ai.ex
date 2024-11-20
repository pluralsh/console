defmodule Console.GraphQl.AI do
  use Console.GraphQl.Schema.Base
  alias Console.AI.Stream
  alias Console.GraphQl.Resolvers.AI
  alias Console.GraphQl.Resolvers.{User, AI, Deployments}

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

  @desc "the items you want to reference in this pin"
  input_object :ai_pin_attributes do
    field :name,       :string
    field :insight_id, :id
    field :thread_id,  :id
  end

  @desc "basic user-supplied input for creating an AI chat thread"
  input_object :chat_thread_attributes do
    field :summary,    non_null(:string)
    field :summarized, :boolean, description: "controls whether this thread is autosummarized, set true when users explicitly set summary"
    field :messages,   list_of(:chat_message), description: "a list of messages to add initially when creating this thread"
    field :insight_id, :id, description: "an ai insight this thread was created from"
  end

  object :chat do
    field :id,      non_null(:id)
    field :role,    non_null(:ai_role)
    field :content, non_null(:string)
    field :seq,     non_null(:integer)

    field :thread,  :chat_thread, resolve: dataloader(AI)

    timestamps()
  end

  @desc "A list of chat messages around a specific topic created on demand"
  object :chat_thread do
    field :id,       non_null(:id)
    field :summary,  non_null(:string)
    field :default,  non_null(:boolean)

    field :last_message_at, :datetime

    field :user,     :user, resolve: dataloader(User)
    field :insight,  :ai_insight, resolve: dataloader(AI)

    connection field :chats, node_type: :chat do
      resolve &AI.list_chats/3
    end

    timestamps()
  end

  @desc "A saved item for future ai-based investigation"
  object :ai_pin do
    field :id,      non_null(:id)
    field :name,    :string
    field :insight, :ai_insight, resolve: dataloader(AI)
    field :thread,  :chat_thread, resolve: dataloader(AI)

    timestamps()
  end

  @desc "A representation of a LLM-derived insight"
  object :ai_insight do
    field :id,        non_null(:id)
    field :sha,       :string, description: "a deduplication sha for this insight"
    field :text,      :string, description: "the text of this insight"
    field :summary,   :string, description: "a shortish summary of this insight"
    field :freshness, :insight_freshness, resolve: fn insight, _, _ -> {:ok, Console.Schema.AiInsight.freshness(insight)} end
    field :error,     list_of(:service_error), description: "any errors generated when compiling this insight"

    field :service,           :service_deployment,   resolve: dataloader(Deployments)
    field :stack,             :infrastructure_stack, resolve: dataloader(Deployments)
    field :cluster,           :cluster,              resolve: dataloader(Deployments)
    field :stack_run,         :stack_run,            resolve: dataloader(Deployments)
    field :service_component, :service_component,    resolve: dataloader(Deployments)

    field :cluster_insight_component, :cluster_insight_component,    resolve: dataloader(Deployments)

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

    field :cluster, :cluster, resolve: dataloader(Deployments)

    @desc "the raw kubernetes resource itself, this is an expensive fetch and should be used sparingly"
    field :resource, :kubernetes_unstructured do
      resolve &AI.raw_resource/3
    end
  end

  connection node_type: :chat
  connection node_type: :chat_thread
  connection node_type: :ai_pin

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

    @desc "gets an individual chat thread, with the ability to sideload chats on top"
    field :chat_thread, :chat_thread do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &AI.thread/2
    end

    @desc "gets the chat history from prior AI chat sessions"
    connection field :chats, node_type: :chat do
      middleware Authenticated
      arg :thread_id, :id

      resolve &AI.chats/2
    end

    field :cluster_insight_component, :cluster_insight_component do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &AI.resolve_cluster_insight_component/2
    end

    connection field :chat_threads, node_type: :chat_thread do
      middleware Authenticated

      resolve &AI.threads/2
    end

    connection field :ai_pins, node_type: :ai_pin do
      middleware Authenticated

      resolve &AI.pins/2
    end

    field :ai_pin, :ai_pin do
      middleware Authenticated
      arg :insight_id, :id
      arg :thread_id,  :id

      resolve &AI.resolve_pin/2
    end
  end

  object :ai_mutations do
    @desc "saves a list of chat messages to your current chat history, can be used at any time"
    field :save_chats, list_of(:chat) do
      middleware Authenticated
      arg :thread_id, :id
      arg :messages,  list_of(:chat_message)

      resolve &AI.save_chats/2
    end

    @desc "saves a set of messages and generates a new one transactionally"
    field :chat, :chat do
      middleware Authenticated
      arg :thread_id, :id
      arg :messages,  list_of(:chat_message)

      resolve &AI.chat/2
    end

    @desc "Wipes your current chat history blank"
    field :clear_chat_history, :integer do
      middleware Authenticated
      arg :thread_id, :id
      arg :before,    :integer, description: "deletes all chats with seq less than or equal to this integer"

      resolve &AI.clear_chats/2
    end

    field :create_thread, :chat_thread do
      middleware Authenticated
      arg :attributes, non_null(:chat_thread_attributes)

      resolve &AI.create_thread/2
    end

    field :update_thread, :chat_thread do
      middleware Authenticated
      arg :id,         non_null(:id)
      arg :attributes, non_null(:chat_thread_attributes)

      resolve &AI.update_thread/2
    end

    field :delete_thread, :chat_thread do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &AI.delete_thread/2
    end

    @desc "deletes a chat from a users history"
    field :delete_chat, :chat do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &AI.delete_chat/2
    end

    field :create_pin, :ai_pin do
      middleware Authenticated
      arg :attributes, non_null(:ai_pin_attributes)

      resolve &AI.create_pin/2
    end

    field :delete_pin, :ai_pin do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &AI.delete_pin/2
    end
  end

  object :ai_subscriptions do
    @desc "streams chunks of ai text for a given parent scope"
    field :ai_stream, :string do
      middleware Authenticated
      arg :insight_id, :id, description: "the insight id to use when streaming a fix suggestion"
      arg :thread_id,  :id, description: "the thread id for streaming a chat suggestion"

      config fn
        %{insight_id: id}, %{context: %{current_user: user}} when is_binary(id) ->
          {:ok, topic: Stream.topic(:inssight, id, user)}
        %{thread_id: id}, %{context: %{current_user: user}} when is_binary(id) ->
          {:ok, topic: Stream.topic(:thread, id, user)}
        _, _ -> {:error, "no id provided for this subscription"}
      end
    end
  end
end
