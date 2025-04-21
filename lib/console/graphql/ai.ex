defmodule Console.GraphQl.AI do
  use Console.GraphQl.Schema.Base
  alias Console.AI.Stream
  alias Console.GraphQl.Resolvers.AI
  alias Console.GraphQl.Resolvers.{User, AI, Deployments}

  ecto_enum :chat_type, Console.Schema.Chat.Type
  ecto_enum :evidence_type, Console.Schema.AiInsightEvidence.Type

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

  @desc "The source of additional context to send to a thread"
  enum :context_source do
    value :service
    value :stack
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
    field :flow_id,    :id, description: "the flow this thread was created in"
    field :settings,   :chat_thread_settings_attributes, description: "the settings for this thread"
  end

  @desc "the settings for an AI chat thread"
  input_object :chat_thread_settings_attributes do
    field :memory, :boolean, description: "controls whether this thread uses knowledge graph-basedmemory"
  end

  object :chat do
    field :id,           non_null(:id)
    field :type,         non_null(:chat_type)
    field :role,         non_null(:ai_role)
    field :content,      :string
    field :seq,          non_null(:integer)
    field :confirm,      :boolean, description: "whether this chat requires confirmation"
    field :confirmed_at, :datetime, description: "when the chat was confirmed"
    field :attributes,   :chat_type_attributes

    field :pull_request, :pull_request, resolve: dataloader(Deployments)
    field :thread,       :chat_thread,  resolve: dataloader(AI)
    field :server,       :mcp_server,   resolve: dataloader(Deployments)

    timestamps()
  end

  @desc "Additional attributes of this chat message, used for formatting it in the display"
  object :chat_type_attributes do
    field :file, :chat_file
    field :tool, :chat_tool
  end

  @desc "Additional attributes for describing a file type chat"
  object :chat_file do
    field :name, :string
  end

  @desc "Additional attributes for describing a tool call that derived this chat message"
  object :chat_tool do
    field :name,      :string
    field :arguments, :map
  end

  @desc "A list of chat messages around a specific topic created on demand"
  object :chat_thread do
    field :id,       non_null(:id)
    field :summary,  non_null(:string)
    field :default,  non_null(:boolean)
    field :settings, :chat_thread_settings

    field :last_message_at, :datetime

    field :flow,     :flow,       resolve: dataloader(Deployments)
    field :user,     :user,       resolve: dataloader(User)
    field :insight,  :ai_insight, resolve: dataloader(AI)

    @desc "the tools associated with this chat.  This is a complex operation that requires querying associated mcp servers, do not use in lists"
    field :tools, list_of(:mcp_server_tool) do
      resolve &AI.chat_tools/3
    end

    connection field :chats, node_type: :chat do
      resolve &AI.list_chats/3
    end

    timestamps()
  end

  @desc "the settings for an AI chat thread"
  object :chat_thread_settings do
    field :memory, :boolean, description: "controls whether this thread uses knowledge graph-basedmemory"
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
    field :error,     list_of(:service_error), description: "any errors generated when compiling this insight"

    field :freshness, :insight_freshness, resolve: fn insight, _, _ ->
      {:ok, Console.Schema.AiInsight.freshness(insight)}
    end

    field :alert,             :alert,                resolve: dataloader(Deployments)
    field :service,           :service_deployment,   resolve: dataloader(Deployments)
    field :stack,             :infrastructure_stack, resolve: dataloader(Deployments)
    field :cluster,           :cluster,              resolve: dataloader(Deployments)
    field :stack_run,         :stack_run,            resolve: dataloader(Deployments)
    field :service_component, :service_component,    resolve: dataloader(Deployments)
    field :stack_state,       :stack_state,          resolve: dataloader(Deployments)

    field :evidence, list_of(:ai_insight_evidence),  resolve: dataloader(AI)

    field :cluster_insight_component, :cluster_insight_component, resolve: dataloader(Deployments)

    timestamps()
  end

  object :ai_insight_evidence do
    field :id,           non_null(:id)
    field :type,         non_null(:evidence_type)

    field :logs,         :logs_evidence
    field :alert,        :alert_evidence
    field :pull_request, :pull_request_evidence
    field :knowledge,    :knowledge_evidence

    timestamps()
  end

  object :logs_evidence do
    field :service_id, :id
    field :cluster_id, :id
    field :lines, list_of(:log_line)
  end

  object :alert_evidence do
    field :title,      :string
    field :message,    :string
    field :alert_id,   :id
    field :resolution, :string
  end

  object :pull_request_evidence do
    field :url,      :string
    field :title,    :string
    field :repo,     :string
    field :sha,      :string
    field :filename, :string
    field :contents, :string
    field :patch,    :string
  end

  object :knowledge_evidence do
    field :name, :string
    field :type, :string
    field :observations, list_of(:string)
  end

  @desc "A kubernetes object used in the course of generating a cluster insight"
  object :cluster_insight_component do
    field :id,        non_null(:id)
    field :group,     :string
    field :version,   non_null(:string)
    field :kind,      non_null(:string)
    field :namespace, :string
    field :name,      non_null(:string)

    field :cluster, :cluster,    resolve: dataloader(Deployments)
    field :insight, :ai_insight, resolve: dataloader(AI)

    @desc "the raw kubernetes resource itself, this is an expensive fetch and should be used sparingly"
    field :resource, :kubernetes_unstructured do
      resolve &AI.raw_resource/3
      middleware ErrorHandler
    end
  end

  object :ai_delta do
    field :seq,     non_null(:integer)
    field :content, non_null(:string)
    field :message, :integer
    field :role,    :ai_role
  end

  connection node_type: :chat
  connection node_type: :chat_thread
  connection node_type: :ai_pin

  object :ai_queries do
    field :ai_insight, :ai_insight do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &AI.resolve_insight/2
    end

    @desc "General api to query the configured LLM for your console"
    field :ai_completion, :string do
      middleware Authenticated
      arg :system,   non_null(:string), description: "the initial system prompt to use for this completion"
      arg :input,    :string, description: "the actual user-provided prompt to give to the underlying LLM"
      arg :chat,     list_of(:chat_message), description: "a list of chat prompts to give to the llm"
      arg :scope_id, :string, description: "a scope id to use when streaming responses back to the client"

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
      arg :flow_id, :id, description: "only show threads for this flow"

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

    field :mcp_token, :string do
      middleware Authenticated

      resolve &AI.mcp_token/2
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

    @desc "Chat mutation that can also execute MCP servers in line with the overall completion"
    field :hybrid_chat, list_of(:chat) do
      middleware Authenticated
      arg :thread_id, :id
      arg :messages,  list_of(:chat_message)

      resolve &AI.hybrid_chat/2
    end

    @desc "Confirms a chat message and calls its MCP server, if the user has access to the thread"
    field :confirm_chat, :chat do
      middleware Authenticated
      arg :id, non_null(:id), description: "the id of the chat message to confirm"

      resolve &AI.confirm_chat/2
    end

    @desc "Cancels a chat message, if the user has access to the thread, by just deleting the chat record"
    field :cancel_chat, :chat do
      middleware Authenticated
      arg :id, non_null(:id), description: "the id of the chat message to cancel"

      resolve &AI.cancel_chat/2
    end

    @desc "Creates a pull request given the thread message history"
    field :thread_pr, :chat do
      middleware Authenticated
      arg :thread_id, non_null(:id)

      resolve &AI.thread_pr/2
    end

    @desc "it will add additional context to the given chat from a source object"
    field :add_chat_context, list_of(:chat) do
      middleware Authenticated
      arg :source,    non_null(:context_source)
      arg :source_id, :id
      arg :thread_id, non_null(:id)

      resolve &AI.add_context/2
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

    field :clone_thread, :chat_thread do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &AI.clone_thread/2
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

    field :ai_fix_pr, :pull_request do
      middleware Authenticated
      arg :insight_id, non_null(:id)
      arg :messages,   list_of(:chat_message)

      resolve &AI.fix_pr/2
    end
  end

  object :ai_subscriptions do
    @desc "streams chunks of ai text for a given parent scope"
    field :ai_stream, :ai_delta do
      arg :insight_id,        :id, description: "the insight id to use when streaming a fix suggestion"
      arg :thread_id,         :id, description: "the thread id for streaming a chat suggestion"
      arg :scope_id,          :string, description: "an arbitrary scope id to use for explain w/ ai"
      arg :recommendation_id, :id, description: "the id of the scaling recommendation you're streaming a cost PR suggestion for"

      config fn
        %{insight_id: id}, %{context: %{current_user: user}} when is_binary(id) ->
          {:ok, topic: Stream.topic(:insight, id, user)}
        %{thread_id: id}, %{context: %{current_user: user}} when is_binary(id) ->
          {:ok, topic: Stream.topic(:thread, id, user)}
        %{recommendation_id: id}, %{context: %{current_user: user}} when is_binary(id) ->
          {:ok, topic: Stream.topic(:cost, id, user)}
        %{scope_id: id}, %{context: %{current_user: user}} when is_binary(id) ->
          {:ok, topic: Stream.topic(:freeform, id, user)}
        _, _ -> {:error, "no id provided for this subscription"}
      end
    end
  end
end
