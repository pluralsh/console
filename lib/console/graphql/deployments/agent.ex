defmodule Console.GraphQl.Deployments.Agent do
  use Console.GraphQl.Schema.Base
  alias Console.Deployments.Agents
  alias Console.Schema.{AgentRuntime, AgentRun}
  alias Console.GraphQl.Resolvers.{Deployments, User}

  ecto_enum :agent_runtime_type, AgentRuntime.Type
  ecto_enum :agent_run_status, AgentRun.Status
  ecto_enum :agent_run_mode, AgentRun.Mode
  ecto_enum :agent_message_tool_state, Console.Schema.AgentMessage.ToolState
  ecto_enum :agent_run_language, AgentRun.Language


  input_object :agent_runtime_attributes do
    field :name,                non_null(:string), description: "the name of this runtime"
    field :type,                non_null(:agent_runtime_type), description: "the type of this runtime"
    field :create_bindings,     list_of(:agent_binding_attributes), description: "the policy for creating runs on this runtime"
    field :ai_proxy,            :boolean, description: "whether this runtime uses the built-in Plural AI proxy"
    field :default,             :boolean, description: "whether this is the default runtime for coding agents"
  end

  input_object :agent_binding_attributes do
    field :user_email, :string, description: "the email of the user this binding is for"
    field :group_name, :string, description: "the name of the group this binding is for"
  end

  input_object :agent_run_attributes do
    field :prompt,           non_null(:string), description: "the prompt to give to the agent"
    field :repository,       non_null(:string), description: "the repository the agent will be working in"
    field :mode,             non_null(:agent_run_mode), description: "the mode of the agent run"
    field :language,         :agent_run_language, description: "the programming language used in the agent run"
    field :language_version, :string, description: "the version of the language to use, if you wish to specify"
    field :flow_id,          :id, description: "the flow this agent run is associated with"
  end

  input_object :agent_run_status_attributes do
    field :status,        non_null(:agent_run_status), description: "the status of this agent run"
    field :messages,      list_of(:agent_message_attributes), description: "the messages this agent run has generated during its run"
    field :error,         :string, description: "the error reason of the agent run"
    field :pod_reference, :namespaced_name, description: "the kubernetes pod this agent is running on"
  end

  input_object :agent_pull_request_attributes do
    field :title,      non_null(:string), description: "the title of the pull request"
    field :body,       non_null(:string), description: "the body of the pull request"
    field :base,       non_null(:string), description: "the base branch of the pull request"
    field :head,       non_null(:string), description: "the head branch of the pull request"
  end

  input_object :agent_todo_attributes do
    field :title,       non_null(:string), description: "the title of the todo"
    field :description, non_null(:string), description: "the description of the todo"
    field :done,        non_null(:boolean), description: "whether the todo is done"
  end

  input_object :agent_analysis_attributes do
    field :summary,  non_null(:string), description: "the summary of the analysis"
    field :analysis, non_null(:string), description: "the analysis of the agent run"
    field :bullets,  list_of(:string), description: "the bullets of the analysis"
  end

  input_object :agent_message_attributes do
    field :message,  non_null(:string), description: "the message to send to the agent"
    field :role,     non_null(:ai_role), description: "the role of the message"
    field :cost,     :agent_message_cost_attributes
    field :metadata, :agent_message_metadata_attributes
  end

  input_object :agent_message_cost_attributes do
    field :total,  non_null(:float), description: "the total cost of the message"
    field :tokens, :agent_message_tokens_attributes, description: "the tokens of the message"
  end

  input_object :agent_message_tokens_attributes do
    field :input,     :float, description: "the input tokens of the message"
    field :output,    :float, description: "the output tokens of the message"
    field :reasoning, :float, description: "the reasoning tokens of the message"
  end

  input_object :agent_message_metadata_attributes do
    field :reasoning, :agent_message_reasoning_attributes, description: "the reasoning of the message"
    field :file,      :agent_message_file_attributes, description: "the file of the message"
    field :tool,      :agent_message_tool_attributes, description: "the tool of the message"
  end

  input_object :agent_message_reasoning_attributes do
    field :text,  :string, description: "the text of the reasoning"
    field :start, :integer, description: "the start of the reasoning"
    field :end,   :integer, description: "the end of the reasoning"
  end

  input_object :agent_message_file_attributes do
    field :name,  :string, description: "the name of the file"
    field :text,  :string, description: "the text of the file"
    field :start, :integer, description: "the start of the file"
    field :end,   :integer, description: "the end of the file"
  end

  input_object :agent_message_tool_attributes do
    field :name,   :string, description: "the name of the tool"
    field :state,  :agent_message_tool_state, description: "the state of the tool"
    field :output, :string, description: "the output of the tool"
  end

  object :agent_runtime do
    field :id,              non_null(:id)
    field :name,            non_null(:string), description: "the name of this runtime"
    field :type,            non_null(:agent_runtime_type), description: "the type of this runtime"
    field :ai_proxy,        :boolean, description: "whether this runtime uses the built-in Plural AI proxy"
    field :default,         :boolean, description: "whether this is the default runtime for coding agents"

    field :cluster,         :cluster, resolve: dataloader(Deployments), description: "the cluster this runtime is running on"
    field :create_bindings, list_of(:policy_binding), resolve: dataloader(Deployments), description: "the policy for creating runs on this runtime"

    connection field :pending_runs, node_type: :agent_run do
      middleware ClusterAuthenticated

      resolve &Deployments.pending_agent_runs/3
    end

    timestamps()
  end

  object :agent_run do
    field :id,               non_null(:id)
    field :prompt,           non_null(:string), description: "the prompt this agent was given"
    field :repository,       non_null(:string), description: "the repository the agent will be working in",
      resolve: &Deployments.agent_repository/3
    field :branch,           :string, description: "the branch this agent run is operating on (if not set, use default branch on clone)"
    field :status,           non_null(:agent_run_status), description: "the status of this agent run"
    field :mode,             non_null(:agent_run_mode), description: "the mode of the agent run"
    field :pod_reference,    :agent_pod_reference, description: "the kubernetes pod this agent is running on"
    field :error,            :string, description: "the error reason of the agent run"
    field :shared,           :boolean, description: "whether this agent run is shared"
    field :language,         :agent_run_language, description: "the programming language used in the agent run"
    field :language_version, :string, description: "the version of the language to use, if you wish to specify"

    field :analysis, :agent_analysis, description: "the analysis of the agent run"
    field :todos,    list_of(:agent_todo), description: "the todos of the agent run"

    field :scm_creds,    :scm_creds, resolve: &Deployments.agent_scm_credentials/3
    field :plural_creds, :plural_creds, resolve: &Deployments.agent_plural_creds/3

    @desc "the kubernetes pod running this agent (should only be fetched lazily as this is a heavy operation)"
    field :pod, :pod do
      resolve fn run, _, _ -> Agents.run_pod(run) end
      middleware ErrorHandler
    end

    field :prompts,  list_of(:agent_prompt), resolve: dataloader(Deployments), description: "the prompts this agent run has received"
    field :messages, list_of(:agent_message), resolve: dataloader(Deployments), description: "the messages this agent run has generated during its run"
    field :runtime,  :agent_runtime, resolve: dataloader(Deployments), description: "the runtime this agent is using"
    field :user,     :user,          resolve: dataloader(User), description: "the user who initiated this agent run"
    field :flow,     :flow,          resolve: dataloader(Deployments), description: "the flow this agent is associated with"

    field :pull_requests, list_of(:pull_request),
      resolve: dataloader(Deployments),
      description: "the pull requests this agent run has created"

    timestamps()
  end

  @desc "A history of prompts attached to this agent run.  The ids are unique and monotonic, and can be used for ordering"
  object :agent_prompt_history do
    field :id,          non_null(:id)
    field :prompt,      non_null(:string), description: "the prompt to give this agent run"

    timestamps()
  end

  object :scm_creds do
    field :username, non_null(:string)
    field :token,    non_null(:string)
  end

  object :agent_pod_reference do
    field :name,      non_null(:string)
    field :namespace, non_null(:string)
  end

  object :agent_analysis do
    field :summary,  non_null(:string), description: "the summary of the analysis"
    field :analysis, non_null(:string), description: "the analysis of the agent run"
    field :bullets,  list_of(:string), description: "quick bullet points to summarize the analysis"
  end

  object :agent_todo do
    field :title,       non_null(:string), description: "the title of the todo"
    field :description, non_null(:string), description: "the description of the todo"
    field :done,        :boolean, description: "whether the todo is done"
  end

  object :agent_message do
    field :id,       non_null(:id)
    field :role,     non_null(:ai_role), description: "the role of the message (system, assistant, user)"
    field :message,  non_null(:string), description: "the message to send to the agent"
    field :seq,      non_null(:integer), description: "the sequence number of the message"
    field :cost,     :agent_message_cost, description: "the cost of the message"
    field :metadata, :agent_message_metadata, description: "the metadata of the message"

    timestamps()
  end

  object :agent_prompt do
    field :id,     non_null(:id)
    field :prompt, non_null(:string), description: "the prompt to give this agent run"
    field :seq,    non_null(:integer), description: "the sequence number of the prompt"

    timestamps()
  end

  object :agent_message_cost do
    field :total,  non_null(:float), description: "the total cost of the message"
    field :tokens, :agent_message_tokens, description: "the tokens of the message"
  end

  object :agent_message_tokens do
    field :input,     :float, description: "the input tokens of the message"
    field :output,    :float, description: "the output tokens of the message"
    field :reasoning, :float, description: "the reasoning tokens of the message"
  end

  object :agent_message_metadata do
    field :reasoning, :agent_message_reasoning, description: "the reasoning of the message"
    field :file,      :agent_message_file, description: "the file of the message"
    field :tool,      :agent_message_tool, description: "the tool of the message"
  end

  object :agent_message_reasoning do
    field :text,  :string, description: "the text of the reasoning"
    field :start, :integer, description: "the start of the reasoning"
    field :end,   :integer, description: "the end of the reasoning"
  end

  object :agent_message_file do
    field :name,  :string, description: "the name of the file"
    field :text,  :string, description: "the text of the file"
    field :start, :integer, description: "the start of the file"
    field :end,   :integer, description: "the end of the file"
  end

  object :agent_message_tool do
    field :name,   :string, description: "the name of the tool"
    field :state,  :agent_message_tool_state, description: "the state of the tool"
    field :output, :string, description: "the output of the tool"
  end

  connection node_type: :agent_runtime
  connection node_type: :agent_run

  delta :agent_message
  delta :agent_run

  object :public_agent_queries do
    field :agent_runtime, :agent_runtime do
      middleware Authenticated, :cluster
      arg :id,   :id
      arg :name, :string

      resolve &Deployments.agent_runtime/2
    end

    field :agent_run, :agent_run do
      middleware Authenticated, :cluster
      arg :id, non_null(:id)

      resolve &Deployments.agent_run/2
    end
  end

  object :public_agent_mutations do
    field :upsert_agent_runtime, :agent_runtime do
      middleware ClusterAuthenticated
      arg :attributes, non_null(:agent_runtime_attributes)

      resolve &Deployments.upsert_agent_runtime/2
    end

    field :delete_agent_runtime, :agent_runtime do
      middleware ClusterAuthenticated
      arg :id, non_null(:id)

      resolve &Deployments.delete_agent_runtime/2
    end

    field :update_agent_run, :agent_run do
      middleware ClusterAuthenticated
      arg :id, non_null(:id)
      arg :attributes, non_null(:agent_run_status_attributes)

      resolve &Deployments.update_agent_run/2
    end

    field :update_agent_run_analysis, :agent_run do
      middleware Authenticated
      arg :id, non_null(:id)
      arg :attributes, non_null(:agent_analysis_attributes)

      resolve &Deployments.update_agent_run_analysis/2
    end

    field :update_agent_run_todos, :agent_run do
      middleware Authenticated
      arg :id, non_null(:id)
      arg :todos, list_of(:agent_todo_attributes)

      resolve &Deployments.update_agent_run_todos/2
    end

    field :create_agent_message, :agent_message do
      middleware ClusterAuthenticated
      arg :run_id, non_null(:id)
      arg :attributes, non_null(:agent_message_attributes)

      resolve &Deployments.create_agent_message/2
    end
  end

  object :agent_queries do
    field :shared_agent_run, :agent_run do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.shared_agent_run/2
    end

    connection field :agent_runtimes, node_type: :agent_runtime do
      middleware Authenticated
      arg :q,    :string
      arg :type, :agent_runtime_type

      resolve &Deployments.agent_runtimes/2
    end

    connection field :agent_runs, node_type: :agent_run do
      middleware Authenticated
      arg :runtime_id, :id

      resolve &Deployments.agent_runs/2
    end
  end

  object :agent_mutations do
    field :cancel_agent_run, :agent_run do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.cancel_agent_run/2
    end

    field :create_agent_run, :agent_run do
      middleware Authenticated
      arg :runtime_id, non_null(:id)
      arg :attributes, non_null(:agent_run_attributes)

      resolve &Deployments.create_agent_run/2
    end

    field :share_agent_run, :agent_run do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.share_agent_run/2
    end

    field :agent_pull_request, :pull_request do
      middleware Authenticated
      arg :run_id,     non_null(:id)
      arg :attributes, non_null(:agent_pull_request_attributes)

      resolve &Deployments.agent_pull_request/2
    end
  end

  object :agent_subscriptions do
    field :agent_message_delta, :agent_message_delta do
      arg :run_id, non_null(:id)

      config fn %{run_id: run_id}, ctx ->
        with {:ok, run} <- Deployments.agent_run(%{id: run_id}, ctx),
          do: {:ok, topic: "agent_runs:msgs:#{run.id}"}
      end
    end

    field :agent_run_delta, :agent_run_delta do
      arg :id, non_null(:id)

      config fn args, ctx ->
        with {:ok, run} <- Deployments.agent_run(args, ctx),
          do: {:ok, topic: "agent_runs:#{run.id}"}
      end
    end
  end
end
