defmodule Console.GraphQl.Deployments.Workbench do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.{Deployments, User}

  ecto_enum :workbench_tool_type, Console.Schema.WorkbenchTool.Tool
  ecto_enum :workbench_tool_category, Console.Schema.WorkbenchTool.Category
  ecto_enum :workbench_tool_http_method, Console.Schema.WorkbenchTool.HttpMethod
  ecto_enum :workbench_job_status, Console.Schema.WorkbenchJob.Status
  ecto_enum :workbench_job_activity_status, Console.Schema.WorkbenchJobActivity.Status
  ecto_enum :workbench_job_activity_type, Console.Schema.WorkbenchJobActivity.Type
  ecto_enum :workbench_job_result_todo_status, Console.Schema.WorkbenchJobResult.TodoStatus

  input_object :workbench_job_attributes do
    field :prompt, :string, description: "the prompt for this job"
  end

  input_object :workbench_attributes do
    field :name,             :string, description: "the name of the workbench"
    field :description,      :string, description: "the description of the workbench"
    field :system_prompt,    :string, description: "the system prompt for the workbench"
    field :project_id,       :id, description: "the project for this workbench"
    field :repository_id,    :id, description: "the git repository for this workbench"
    field :agent_runtime_id, :id, description: "the agent runtime for this workbench"
    field :configuration,     :workbench_configuration_attributes, description: "workbench configuration"
    field :skills,           :workbench_skills_attributes, description: "skills configuration (ref and files)"
    field :tool_associations, list_of(:workbench_tool_association_attributes), description: "tool ids to associate with this workbench"
  end

  input_object :workbench_configuration_attributes do
    field :infrastructure, :workbench_infrastructure_attributes, description: "infrastructure capabilities (services, stacks, kubernetes)"
    field :coding,         :workbench_coding_attributes, description: "coding capabilities (mode, repositories)"
  end

  input_object :workbench_infrastructure_attributes do
    field :services,   :boolean, description: "enable services capability"
    field :stacks,     :boolean, description: "enable stacks capability"
    field :kubernetes, :boolean, description: "enable kubernetes capability"
  end

  input_object :workbench_coding_attributes do
    field :mode,         :agent_run_mode, description: "the mode of the coding agent (e.g. analyze, write)"
    field :repositories, list_of(:string), description: "allowed repository identifiers"
  end

  input_object :workbench_skills_attributes do
    field :ref,   :git_ref_attributes, description: "git reference for skills"
    field :files, list_of(:string), description: "files to include"
  end

  input_object :workbench_tool_association_attributes do
    field :tool_id, non_null(:id), description: "the workbench tool id to associate"
  end

  input_object :workbench_tool_attributes do
    field :name,          non_null(:string), description: "the name of the tool (a-z, 0-9, underscores)"
    field :tool,          non_null(:workbench_tool_type), description: "the type of tool"
    field :categories,    list_of(:workbench_tool_category), description: "categories for the tool"
    field :project_id,    :id, description: "the project for this tool"
    field :configuration, :workbench_tool_configuration_attributes, description: "tool configuration (e.g. http)"
  end

  input_object :workbench_tool_configuration_attributes do
    field :http, :workbench_tool_http_configuration_attributes, description: "http tool configuration"
  end

  input_object :workbench_tool_http_configuration_attributes do
    field :url,          non_null(:string), description: "the request url"
    field :method,       non_null(:workbench_tool_http_method), description: "the http method"
    field :headers,      list_of(:workbench_tool_http_header_attributes), description: "request headers"
    field :body,         :string, description: "request body"
    field :input_schema, :json, description: "JSON schema for the tool input"
  end

  input_object :workbench_tool_http_header_attributes do
    field :name,  :string
    field :value, :string
  end

  object :workbench do
    field :id,            non_null(:string), description: "the id of the workbench"
    field :name,          non_null(:string), description: "the name of the workbench"
    field :description,   :string, description: "the description of the workbench"
    field :system_prompt, :string, description: "the system prompt for the workbench"
    field :project,       :project, resolve: dataloader(Deployments), description: "the project of this workbench"
    field :repository,    :git_repository, resolve: dataloader(Deployments), description: "the git repository for this workbench"
    field :agent_runtime, :agent_runtime, resolve: dataloader(Deployments), description: "the agent runtime for this workbench"
    field :configuration, :workbench_configuration, description: "workbench configuration"
    field :skills,        :workbench_skills, description: "skills configuration"
    field :tools,         list_of(:workbench_tool), resolve: dataloader(Deployments), description: "tools associated with this workbench"

    connection field :runs, node_type: :workbench_job do
      resolve &Deployments.list_workbench_runs/3
    end

    timestamps()
  end

  object :workbench_job do
    field :id,           non_null(:string), description: "the id of the run"
    field :status,       non_null(:workbench_job_status), description: "the status of the run"
    field :prompt,       :string, description: "the prompt for this run"
    field :started_at,   :datetime, description: "when the run started"
    field :completed_at, :datetime, description: "when the run completed"
    field :error,        :string, description: "error message when the job failed"

    field :workbench,    :workbench, resolve: dataloader(Deployments), description: "the workbench this run belongs to"
    field :user,         :user, resolve: dataloader(User), description: "the user who created this run"
    field :result,       :workbench_job_result, resolve: dataloader(Deployments), description: "the result for this job (sideloadable)"

    connection field :activities, node_type: :workbench_job_activity do
      resolve &Deployments.list_workbench_job_activities/3
    end

    timestamps()
  end

  object :workbench_job_activity do
    field :id,       non_null(:string), description: "the id of the activity"
    field :status,   non_null(:workbench_job_activity_status), description: "the status of the activity"
    field :type,     :workbench_job_activity_type, description: "the type of the activity"
    field :prompt,   :string, description: "the prompt for this activity"
    field :result,   :workbench_job_activity_result, description: "embedded result (output, metrics, logs) when present"

    field :workbench_job, :workbench_job, resolve: dataloader(Deployments), description: "the job this activity belongs to"
    field :agent_run,    :agent_run, resolve: dataloader(Deployments), description: "the agent run that executed this activity"

    timestamps()
  end

  object :workbench_job_activity_result do
    field :output,     :string, description: "output from the activity"
    field :job_update, :workbench_job_activity_job_update, description: "job update (diff, theory, conclusion) when present"
    field :metrics,    list_of(:workbench_job_activity_metric), description: "metrics emitted by the activity"
    field :logs,       list_of(:workbench_job_activity_log), description: "logs emitted by the activity"
  end

  object :workbench_job_activity_job_update do
    field :diff,           :string
    field :working_theory, :string
    field :conclusion,     :string
  end

  object :workbench_job_activity_metric do
    field :timestamp, :datetime
    field :name,      :string
    field :value,     :float
    field :labels,    :map
  end

  object :workbench_job_activity_log do
    field :timestamp, :datetime
    field :message,   :string
    field :labels,    :map
  end

  object :workbench_job_result do
    field :id,             non_null(:string), description: "the id of the result"
    field :working_theory,  :string, description: "the working theory for this result"
    field :conclusion,     :string, description: "the conclusion for this result"
    field :todos,          list_of(:workbench_job_result_todo), description: "todos for this result"

    field :workbench_job, :workbench_job, resolve: dataloader(Deployments), description: "the job this result belongs to"

    timestamps()
  end

  object :workbench_job_result_todo do
    field :name,        :string
    field :description, :string
    field :done,        :boolean
  end

  object :workbench_configuration do
    field :infrastructure, :workbench_infrastructure, description: "infrastructure capabilities"
    field :coding,         :workbench_coding, description: "coding capabilities"
  end

  object :workbench_infrastructure do
    field :services,   :boolean, description: "services capability enabled"
    field :stacks,     :boolean, description: "stacks capability enabled"
    field :kubernetes, :boolean, description: "kubernetes capability enabled"
  end

  object :workbench_coding do
    field :mode,         :agent_run_mode, description: "the mode of the coding agent"
    field :repositories, list_of(:string), description: "allowed repository identifiers"
  end

  object :workbench_skills do
    field :ref,   :git_ref, description: "git reference for skills"
    field :files, list_of(:string), description: "files to include"
  end

  object :workbench_tool do
    field :id,            non_null(:string), description: "the id of the tool"
    field :name,          non_null(:string), description: "the name of the tool"
    field :tool,          non_null(:workbench_tool_type), description: "the type of tool"
    field :categories,    list_of(:workbench_tool_category), description: "categories for the tool"
    field :project,       :project, resolve: dataloader(Deployments), description: "the project of this tool"
    field :configuration, :workbench_tool_configuration, description: "tool configuration"

    timestamps()
  end

  object :workbench_tool_configuration do
    field :http, :workbench_tool_http_configuration, description: "http tool configuration"
  end

  object :workbench_tool_http_configuration do
    field :url,          :string, description: "the request url"
    field :method,       :string, description: "the http method"
    field :headers,      list_of(:workbench_tool_http_header), description: "request headers"
    field :body,         :string, description: "request body"
    field :input_schema, :map, description: "JSON schema for the tool input"
  end

  object :workbench_tool_http_header do
    field :name,  :string
    field :value, :string
  end

  object :workbench_job_progress do
    field :activity_id, non_null(:id)
    field :text,        :string
    field :tool,        :string
    field :arguments,   :map
  end

  connection node_type: :workbench
  connection node_type: :workbench_tool
  connection node_type: :workbench_job
  connection node_type: :workbench_job_activity

  delta :workbench_job
  delta :workbench_job_activity

  object :workbench_queries do
    field :workbench, :workbench do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :read
      arg :id,   :id
      arg :name, :string

      resolve &Deployments.workbench/2
    end

    field :workbench_tool, :workbench_tool do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :read
      arg :id,   :id
      arg :name, :string

      resolve &Deployments.workbench_tool/2
    end

    connection field :workbenches, node_type: :workbench do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :read
      arg :q, :string
      arg :project_id, :id, description: "filter workbenches by project"

      resolve &Deployments.workbenches/2
    end

    connection field :workbench_tools, node_type: :workbench_tool do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :read
      arg :q, :string
      arg :project_id, :id, description: "filter tools by project"

      resolve &Deployments.workbench_tools/2
    end

    field :workbench_job, :workbench_job do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :read
      arg :id, non_null(:id)

      resolve &Deployments.workbench_job/2
    end
  end

  object :workbench_mutations do
    field :create_workbench, :workbench do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :write
      arg :attributes, :workbench_attributes

      resolve &Deployments.create_workbench/2
    end

    field :update_workbench, :workbench do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :write
      arg :id, non_null(:id)
      arg :attributes, :workbench_attributes

      resolve &Deployments.update_workbench/2
    end

    field :delete_workbench, :workbench do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :write
      arg :id, non_null(:id)

      resolve &Deployments.delete_workbench/2
    end

    field :create_workbench_tool, :workbench_tool do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :write
      arg :attributes, :workbench_tool_attributes

      resolve &Deployments.create_workbench_tool/2
    end

    field :update_workbench_tool, :workbench_tool do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :write
      arg :id, non_null(:id)
      arg :attributes, :workbench_tool_attributes

      resolve &Deployments.update_workbench_tool/2
    end

    field :delete_workbench_tool, :workbench_tool do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :write
      arg :id, non_null(:id)

      resolve &Deployments.delete_workbench_tool/2
    end

    @desc "Creates a new workbench job. Requires read access to the workbench."
    field :create_workbench_job, :workbench_job do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :read
      arg :workbench_id, non_null(:id), description: "the workbench to create a job for"
      arg :attributes,   non_null(:workbench_job_attributes), description: "job attributes (e.g. prompt)"

      resolve &Deployments.create_workbench_job/2
    end
  end

  object :workbench_subscriptions do
    field :workbench_job_delta, :workbench_job_delta do
      arg :id, non_null(:id)

      config fn args, ctx ->
        with {:ok, job} <- Deployments.workbench_job(args, ctx),
          do: {:ok, topic: "workbench_jobs:#{job.id}"}
      end
    end

    field :workbench_job_activity_delta, :workbench_job_activity_delta do
      arg :job_id, non_null(:id)

      config fn %{job_id: job_id}, ctx ->
        with {:ok, _job} <- Deployments.workbench_job(%{id: job_id}, ctx),
          do: {:ok, topic: "workbench_jobs:#{job_id}:activities"}
      end
    end

    field :workbench_job_progress, :workbench_job_progress do
      arg :job_id, non_null(:id)

      config fn %{job_id: job_id}, ctx ->
        with {:ok, _} <- Deployments.workbench_job(%{id: job_id}, ctx),
          do: {:ok, topic: "workbench_jobs:#{job_id}:progress"}
      end
    end
  end
end
