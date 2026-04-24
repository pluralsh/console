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
  ecto_enum :workbench_canvas_block_type, Console.Schema.WorkbenchJobResult.CanvasBlock.Type
  enum :eval_results_period do
    value :day
    value :week
    value :month
  end

  input_object :workbench_job_attributes do
    field :prompt, :string, description: "the prompt for this job"
  end

  input_object :workbench_job_update_attributes do
    field :result, :workbench_result_attributes, description: "the result for this job"
  end

  input_object :workbench_result_attributes do
    field :topology, non_null(:string),
      description: "mermaid diagram text for the job result topology (only field clients may set via this mutation)"
  end

  input_object :workbench_attributes do
    field :name,              non_null(:string), description: "the name of the workbench (must be unique)"
    field :description,       :string, description: "the description of the workbench"
    field :system_prompt,     :string, description: "the system prompt for the workbench"
    field :project_id,        :id, description: "the project for this workbench"
    field :repository_id,     :id, description: "the git repository for this workbench"
    field :agent_runtime_id,  :id, description: "the agent runtime for this workbench"
    field :override_bot_user, :boolean, description: "when true on update, sets botUserId to the authenticated user"
    field :configuration,     :workbench_configuration_attributes, description: "workbench configuration"
    field :skills,            :workbench_skills_attributes, description: "skills configuration (ref and files)"
    field :read_bindings,     list_of(:policy_binding_attributes), description: "users who can read and execute this workbench"
    field :write_bindings,    list_of(:policy_binding_attributes), description: "users who can modify this workbench"
    field :tool_associations, list_of(:workbench_tool_association_attributes), description: "tool ids to associate with this workbench"
    field :workbench_skills,  list_of(:workbench_skill_attributes), description: "skills to include with this workbench"
  end

  input_object :workbench_configuration_attributes do
    field :infrastructure, :workbench_infrastructure_attributes, description: "infrastructure capabilities (services, stacks, kubernetes)"
    field :coding,         :workbench_coding_attributes, description: "coding capabilities (mode, repositories)"
    field :observability,  :workbench_observability_attributes, description: "observability capabilities (logs, metrics)"
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

  input_object :workbench_observability_attributes do
    field :logs,    :boolean, description: "enable logs capability"
    field :metrics, :boolean, description: "enable metrics capability"
  end

  input_object :workbench_skills_attributes do
    field :ref,   :git_ref_attributes, description: "git reference for skills"
    field :files, list_of(:string), description: "files to include"
  end

  input_object :workbench_tool_association_attributes do
    field :tool_id, non_null(:id), description: "the workbench tool id to associate"
  end

  input_object :workbench_cron_attributes do
    field :crontab, :string, description: "cron expression (e.g. */5 * * * *) (required for create)"
    field :prompt,  :string, description: "the prompt to run when the cron triggers"
  end

  input_object :workbench_prompt_attributes do
    field :prompt, non_null(:string), description: "the saved prompt text"
  end

  input_object :workbench_skill_attributes do
    field :name,        non_null(:string), description: "the saved skill name"
    field :description, :string, description: "the saved skill description"
    field :contents,    non_null(:string), description: "the saved skill contents"
  end

  input_object :workbench_eval_attributes do
    field :conclusion_rules, :string, description: "rules for evaluating job conclusions"
    field :prompt_rules,     :string, description: "rules for evaluating job prompts"
    field :progress_rules,   :string, description: "rules for evaluating job progress"
  end

  input_object :workbench_webhook_matches_attributes do
    field :regex,            :string, description: "regex pattern to match in webhook body"
    field :substring,        :string, description: "substring to match in webhook body"
    field :case_insensitive, :boolean, description: "whether matching is case insensitive"
  end

  input_object :workbench_webhook_attributes do
    field :name,                   :string, description: "unique name for this webhook on the workbench (required for create)"
    field :webhook_id,             :id, description: "observability webhook to receive events (either webhook_id or issue_webhook_id required)"
    field :issue_webhook_id,       :id, description: "issue webhook to receive events (either webhook_id or issue_webhook_id required)"
    field :matches,                :workbench_webhook_matches_attributes, description: "criteria to match incoming webhook payloads"
    field :prompt,                 :string, description: "optional prompt text applied when this webhook matches"
    field :override_webhook_user,  :boolean, description: "when true on update, sets userId to the authenticated user"
  end

  input_object :workbench_tool_attributes do
    field :name,                 non_null(:string), description: "the name of the tool (a-z, 0-9, underscores)"
    field :tool,                 non_null(:workbench_tool_type), description: "the type of tool"
    field :categories,           list_of(:workbench_tool_category), description: "categories for the tool"
    field :project_id,           :id, description: "the project for this tool"
    field :mcp_server_id,        :id, description: "the mcp server for this tool"
    field :cloud_connection_id,  :id, description: "the cloud connection for this tool (e.g. infrastructure cloud tools)"
    field :configuration,        :workbench_tool_configuration_attributes, description: "tool configuration (e.g. http)"
  end

  input_object :workbench_tool_configuration_attributes do
    field :http,       :workbench_tool_http_configuration_attributes, description: "http tool configuration"
    field :elastic,    :workbench_tool_elastic_connection_attributes, description: "elasticsearch connection (logs)"
    field :prometheus, :workbench_tool_prometheus_connection_attributes, description: "prometheus connection (metrics)"
    field :loki,       :workbench_tool_loki_connection_attributes, description: "loki connection (logs)"
    field :splunk,     :workbench_tool_splunk_connection_attributes, description: "splunk connection (logs)"
    field :tempo,      :workbench_tool_tempo_connection_attributes, description: "tempo connection (traces)"
    field :jaeger,     :workbench_tool_jaeger_connection_attributes, description: "jaeger connection (traces)"
    field :datadog,    :workbench_tool_datadog_connection_attributes, description: "datadog connection (metrics, logs)"
    field :dynatrace,  :workbench_tool_dynatrace_connection_attributes, description: "dynatrace connection (metrics, logs, traces)"
    field :cloudwatch, :workbench_tool_cloudwatch_connection_attributes, description: "cloudwatch connection (metrics, logs)"
    field :azure,      :workbench_tool_azure_connection_attributes, description: "azure monitor connection (metrics)"
    field :linear,     :workbench_tool_linear_connection_attributes, description: "linear connection (ticketing)"
    field :atlassian,  :workbench_tool_atlassian_connection_attributes, description: "atlassian/jira connection (ticketing)"
  end

  input_object :workbench_tool_elastic_connection_attributes do
    field :url,      non_null(:string), description: "elasticsearch base url"
    field :username, non_null(:string), description: "basic auth username"
    field :password, :string, description: "basic auth password"
    field :index,    non_null(:string), description: "elasticsearch index"
  end

  input_object :workbench_tool_prometheus_connection_attributes do
    field :url,       non_null(:string), description: "prometheus base url"
    field :token,     :string, description: "bearer token or api key"
    field :username,  :string, description: "basic auth username"
    field :password,  :string, description: "basic auth password"
    field :tenant_id, :string, description: "optional tenant id (e.g. for Mimir)"
  end

  input_object :workbench_tool_loki_connection_attributes do
    field :url,       non_null(:string), description: "loki base url"
    field :token,     :string, description: "bearer token or api key"
    field :username,  :string, description: "basic auth username"
    field :password,  :string, description: "basic auth password"
    field :tenant_id, :string, description: "optional tenant id"
  end

  input_object :workbench_tool_tempo_connection_attributes do
    field :url,       non_null(:string), description: "tempo base url"
    field :token,     :string, description: "bearer token or api key"
    field :username,  :string, description: "basic auth username"
    field :password,  :string, description: "basic auth password"
    field :tenant_id, :string, description: "optional tenant id"
  end

  input_object :workbench_tool_jaeger_connection_attributes do
    field :url,      non_null(:string), description: "jaeger base url"
    field :token,    :string, description: "bearer token"
    field :username, :string, description: "basic auth username"
    field :password, :string, description: "basic auth password"
  end

  input_object :workbench_tool_splunk_connection_attributes do
    field :url,       non_null(:string), description: "splunk base url"
    field :token,     :string, description: "bearer token"
    field :username,  :string, description: "basic auth username"
    field :password,  :string, description: "basic auth password"
  end

  input_object :workbench_tool_datadog_connection_attributes do
    field :site,    :string, description: "datadog site (e.g. datadoghq.com)"
    field :api_key, :string, description: "datadog API key"
    field :app_key, :string, description: "datadog application key"
  end

  input_object :workbench_tool_dynatrace_connection_attributes do
    field :url,            non_null(:string), description: "dynatrace base url"
    field :platform_token, non_null(:string), description: "dynatrace platform token"
  end

  input_object :workbench_tool_cloudwatch_connection_attributes do
    field :region,            non_null(:string), description: "aws region (e.g. us-east-1)"
    field :log_group_names,   list_of(:string), description: "optional default log groups for CloudWatch Logs Insights"
    field :access_key_id,     :string, description: "optional static AWS access key id"
    field :secret_access_key, :string, description: "optional static AWS secret access key"
    field :role_arn,          :string, description: "optional IAM role ARN to assume"
    field :external_id,       :string, description: "optional external id for assume role"
    field :role_session_name, :string, description: "optional role session name for assume role"
  end

  input_object :workbench_tool_azure_connection_attributes do
    field :subscription_id, non_null(:string), description: "azure subscription id"
    field :tenant_id,       non_null(:string), description: "azure tenant id"
    field :client_id,       non_null(:string), description: "azure client id"
    field :client_secret,   non_null(:string), description: "azure client secret"
  end

  input_object :workbench_tool_linear_connection_attributes do
    field :access_token, :string, description: "linear API access token"
  end

  input_object :workbench_tool_atlassian_connection_attributes do
    field :service_account, :string, description: "encrypted service account JSON (alternative to api_token + email)"
    field :api_token,       :string, description: "atlassian API token (required if not using service_account)"
    field :email,           :string, description: "atlassian account email (required if not using service_account)"
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

  input_object :workbench_message_attributes do
    field :prompt, non_null(:string), description: "the prompt for the message"
  end

  object :workbench do
    field :id,            non_null(:string), description: "the id of the workbench"
    field :name,          non_null(:string), description: "the name of the workbench"
    field :description,   :string, description: "the description of the workbench"
    field :system_prompt, :string, description: "the system prompt for the workbench"
    field :configuration, :workbench_configuration, description: "workbench configuration"
    field :skills,        :workbench_skills, description: "skills configuration"

    field :project,       :project,                  resolve: dataloader(Deployments), description: "the project of this workbench"
    field :repository,    :git_repository,           resolve: dataloader(Deployments), description: "the git repository for this workbench"
    field :agent_runtime, :agent_runtime,            resolve: dataloader(Deployments), description: "the agent runtime for this workbench"
    field :bot_user,      :user,                     resolve: dataloader(User), description: "the service account user used for automated workbench agent runs"
    field :tools,         list_of(:workbench_tool),  resolve: dataloader(Deployments), description: "tools associated with this workbench"

    field :read_bindings, list_of(:policy_binding),  resolve: dataloader(Deployments), description: "read policy for this service"
    field :write_bindings, list_of(:policy_binding), resolve: dataloader(Deployments), description: "write policy of this service"

    connection field :runs, node_type: :workbench_job do
      arg :alert, :boolean, description: "show runs spawned from alerts"
      arg :issue, :boolean, description: "show runs spawned from issues"

      resolve &Deployments.list_workbench_runs/3
    end

    connection field :crons, node_type: :workbench_cron do
      resolve &Deployments.list_workbench_crons/3
    end

    connection field :prompts, node_type: :workbench_prompt do
      resolve &Deployments.list_workbench_prompts/3
    end

    connection field :workbench_skills, node_type: :workbench_skill do
      resolve &Deployments.list_workbench_skills/3
    end

    field :eval, :workbench_eval,
      description: "eval configuration for this workbench (at most one; null if none configured)",
      resolve: dataloader(Deployments)

    connection field :eval_results, node_type: :workbench_eval_result do
      resolve &Deployments.list_eval_results/3
    end

    connection field :webhooks, node_type: :workbench_webhook do
      resolve &Deployments.list_workbench_webhooks/3
    end

    connection field :alerts, node_type: :alert do
      resolve &Deployments.list_alerts/3
    end

    connection field :issues, node_type: :issue do
      resolve &Deployments.list_issues/3
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
    field :pull_requests, list_of(:pull_request), resolve: dataloader(Deployments), description: "pull requests associated with this workbench job"

    field :alert,        :alert, resolve: dataloader(Deployments), description: "the alert this run was spawned from"
    field :issue,        :issue, resolve: dataloader(Deployments), description: "the issue this run was spawned from"

    connection field :activities, node_type: :workbench_job_activity do
      resolve &Deployments.list_workbench_job_activities/3
    end

    field :metrics_tool, list_of(:workbench_job_activity_metric) do
      arg :name,      :string, description: "the name of the metrics tool"
      arg :arguments, :json,   description: "the arguments for the metrics tool"

      resolve &Deployments.metrics_tool/3
    end

    field :logs_tool, list_of(:workbench_job_activity_log) do
      arg :name,      :string, description: "the name of the logs tool"
      arg :arguments, :json,   description: "the arguments for the logs tool"

      resolve &Deployments.logs_tool/3
    end

    field :whimsey, :string, description: "whimsically describes current progress for you", resolve: &Deployments.whimsey_text/3

    timestamps()
  end

  object :workbench_job_activity do
    field :id,       non_null(:string), description: "the id of the activity"
    field :status,   non_null(:workbench_job_activity_status), description: "the status of the activity"
    field :type,     :workbench_job_activity_type, description: "the type of the activity"
    field :prompt,   :string, description: "the prompt for this activity"
    field :result,   :workbench_job_activity_result, description: "embedded result (output, metrics, logs) when present"
    field :thoughts, list_of(:workbench_job_thought), resolve: dataloader(Deployments), description: "thoughts emitted during this activity"

    field :whimsey, :string, description: "whimsically describes current progress for you", resolve: &Deployments.whimsey_text/3

    field :workbench_job, :workbench_job, resolve: dataloader(Deployments), description: "the job this activity belongs to"
    field :agent_run,    :agent_run, resolve: dataloader(Deployments), description: "the agent run that executed this activity"
    field :agent_runs,   list_of(:agent_run), resolve: dataloader(Deployments), description: "all agent runs associated with this activity (sideloadable)"

    timestamps()
  end

  object :workbench_job_thought do
    field :id,         non_null(:string), description: "the id of the thought"
    field :content,    :string, description: "the thought content"
    field :tool_name,  :string, description: "the tool invoked when this thought was emitted, if any"
    field :tool_args,  :map, description: "arguments passed to the tool, if any"
    field :attributes, :workbench_job_thought_attributes, description: "metrics and logs for the thought"

    field :activity, :workbench_job_activity, resolve: dataloader(Deployments), description: "the activity this thought belongs to"

    timestamps()
  end

  object :workbench_job_thought_attributes do
    field :metrics, list_of(:workbench_job_activity_metric), description: "metrics for the thought"
    field :logs,    list_of(:workbench_job_activity_log), description: "logs for the thought"
  end

  object :workbench_job_activity_result do
    field :output,          :string, description: "output from the activity"
    field :error,           :string, description: "error from the activity"
    field :job_update,      :workbench_job_activity_job_update, description: "job update (diff, theory, conclusion) when present"
    field :canvas,          list_of(:workbench_canvas_block), description: "dashboard canvas blocks for this activity"
    field :metrics,         list_of(:workbench_job_activity_metric), description: "metrics emitted by the activity"
    field :logs,            list_of(:workbench_job_activity_log), description: "logs emitted by the activity"
    field :metrics_queries, list_of(:workbench_tool_query_data), description: "metrics tool queries emitted by the activity"
    field :logs_queries,    list_of(:workbench_tool_query_data), description: "logs tool queries emitted by the activity"
    field :metrics_query,   :workbench_tool_query_data, description: "primary metrics tool query for this activity"
    field :logs_query,      :workbench_tool_query_data, description: "primary logs tool query for this activity"
  end

  object :workbench_job_activity_job_update do
    field :diff,            :string
    field :working_theory,  :string
    field :conclusion,      :string
    field :topology,        :string
    field :todos,           list_of(:workbench_job_result_todo)
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
    field :id,              non_null(:string), description: "the id of the result"
    field :working_theory,  :string, description: "the working theory for this result"
    field :conclusion,      :string, description: "the conclusion for this result"
    field :topology,        :string, description: "a mermaid diagram of the topology of the system in question in this investigation"
    field :todos,           list_of(:workbench_job_result_todo), description: "todos for this result"
    field :canvas,          list_of(:workbench_canvas_block), description: "dashboard canvas blocks for this job result"
    field :metadata,        :workbench_job_result_metadata, description: "metadata for this result"

    field :workbench_job, :workbench_job, resolve: dataloader(Deployments), description: "the job this result belongs to"

    timestamps()
  end

  object :workbench_job_result_metadata do
    field :metrics,        list_of(:workbench_job_activity_metric), description: "metrics for this result"
    field :logs,           list_of(:workbench_job_activity_log), description: "logs for this result"
    field :metrics_query,  :workbench_tool_query_data, description: "metrics tool query for this result"
    field :logs_query,     :workbench_tool_query_data, description: "logs tool query for this result"
  end

  object :workbench_tool_query_data do
    field :tool_name, :string, description: "the tool name used to run this query"
    field :tool_args, :map, description: "arguments used for this tool query"
    field :summary,   :string, description: "a short summary describing what this query means"
  end

  object :workbench_canvas_data_point do
    field :label, :string
    field :value, :float
  end

  object :workbench_canvas_block_layout do
    field :x, :integer
    field :y, :integer
    field :w, :integer
    field :h, :integer
  end

  object :workbench_canvas_tool_graph do
    field :title,   :string
    field :summary, :string
    field :query,   :workbench_tool_query_data
  end

  object :workbench_canvas_block_graph do
    field :title, :string
    field :data,  list_of(:workbench_canvas_data_point)
  end

  object :workbench_canvas_block_content do
    field :markdown, :string
    field :metrics,  :workbench_canvas_tool_graph
    field :logs,     :workbench_canvas_tool_graph
    field :pie,      :workbench_canvas_block_graph
    field :bar,      :workbench_canvas_block_graph
  end

  object :workbench_canvas_block do
    field :identifier, :string
    field :type,       :workbench_canvas_block_type
    field :layout,     :workbench_canvas_block_layout
    field :content,    :workbench_canvas_block_content
  end

  object :workbench_job_result_todo do
    field :name,        :string
    field :description, :string
    field :done,        :boolean
  end

  object :workbench_configuration do
    field :infrastructure, :workbench_infrastructure, description: "infrastructure capabilities"
    field :coding,         :workbench_coding, description: "coding capabilities"
    field :observability,  :workbench_observability, description: "observability capabilities"
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

  object :workbench_observability do
    field :logs,    :boolean, description: "logs capability enabled"
    field :metrics, :boolean, description: "metrics capability enabled"
  end

  object :workbench_skills do
    field :ref,   :git_ref, description: "git reference for skills"
    field :files, list_of(:string), description: "files to include"
  end

  object :workbench_cron do
    field :id,          non_null(:string), description: "the id of the cron"
    field :crontab,     :string, description: "cron expression"
    field :prompt,      :string, description: "prompt to run when the cron triggers"
    field :next_run_at, :datetime, description: "when the cron will next run"
    field :last_run_at, :datetime, description: "when the cron last ran"

    field :workbench, :workbench, resolve: dataloader(Deployments), description: "the workbench this cron belongs to"

    timestamps()
  end

  object :workbench_prompt do
    field :id,     non_null(:string), description: "the id of the saved prompt"
    field :prompt, :string, description: "the saved prompt text"

    field :workbench, :workbench, resolve: dataloader(Deployments), description: "the workbench this prompt belongs to"

    timestamps()
  end

  object :workbench_skill do
    field :id,          non_null(:string), description: "the id of the saved skill"
    field :name,        :string, description: "the saved skill name"
    field :description, :string, description: "the saved skill description"
    field :contents,    :string, description: "the saved skill contents"

    field :workbench, :workbench, resolve: dataloader(Deployments), description: "the workbench this skill belongs to"

    timestamps()
  end

  object :workbench_eval do
    field :id, non_null(:string), description: "the id of the eval configuration"

    field :conclusion_rules, :string, description: "rules for evaluating job conclusions"
    field :prompt_rules,     :string, description: "rules for evaluating job prompts"
    field :progress_rules,   :string, description: "rules for evaluating job progress"

    field :workbench, :workbench, resolve: dataloader(Deployments), description: "the workbench this eval belongs to"

    timestamps()
  end

  object :workbench_eval_feedback do
    field :summary, :string, description: "high-level eval summary"
    field :prompt,  :string, description: "prompt used for grading"
    field :result,  :string, description: "evaluator outcome text"
    field :logic,   :string, description: "evaluator rationale"
  end

  object :workbench_eval_result do
    field :id, non_null(:string), description: "the id of this eval result row"
    field :grade, :integer, description: "numeric grade for the job (0–10 scale)"

    field :feedback, :workbench_eval_feedback, description: "structured feedback for this run"

    field :workbench_eval, :workbench_eval, resolve: dataloader(Deployments), description: "the eval configuration this row belongs to"
    field :workbench_job,  :workbench_job, resolve: dataloader(Deployments), description: "the workbench job that was graded"

    timestamps()
  end

  object :workbench_eval_results_average do
    field :timestamp, :datetime
    field :average, :float
  end

  object :workbench_eval_results_workbench_average do
    field :workbench, :workbench
    field :timestamp, :datetime
    field :average, :float
  end

  object :workbench_pr_merge_rate_entry do
    field :timestamp, :datetime, description: "UTC bucket start for this merge rate sample"
    field :merge_rate, :float, description: "fraction of workbench PRs merged in this bucket (0.0–1.0)"
  end

  object :workbench_pr_merge_rate_by_workbench_entry do
    field :workbench, :workbench, description: "workbench this bucket applies to"
    field :timestamp, :datetime, description: "UTC bucket start for this merge rate sample"
    field :merge_rate, :float, description: "fraction of workbench PRs merged in this bucket (0.0–1.0)"
  end

  object :workbench_webhook_matches do
    field :regex,            :string, description: "regex pattern to match"
    field :substring,        :string, description: "substring to match"
    field :case_insensitive,  :boolean, description: "case insensitive matching"
  end

  object :workbench_webhook do
    field :id,     non_null(:string), description: "the id of the webhook"
    field :name,   :string, description: "name of this webhook trigger"
    field :prompt, :string, description: "optional prompt text applied when this webhook matches"
    field :matches, :workbench_webhook_matches, description: "criteria to match incoming webhook payloads"

    field :workbench,     :workbench, resolve: dataloader(Deployments), description: "the workbench this webhook belongs to"
    field :webhook,       :observability_webhook, resolve: dataloader(Deployments), description: "the observability webhook that receives events"
    field :issue_webhook, :issue_webhook, resolve: dataloader(Deployments), description: "the issue webhook that receives events"
    field :user,          :user, resolve: dataloader(User), description: "the user who created this webhook"

    timestamps()
  end

  object :workbench_tool do
    field :id,               non_null(:string), description: "the id of the tool"
    field :name,             non_null(:string), description: "the name of the tool"
    field :tool,             non_null(:workbench_tool_type), description: "the type of tool"
    field :categories,       list_of(:workbench_tool_category), description: "categories for the tool"
    field :project,          :project, resolve: dataloader(Deployments), description: "the project of this tool"
    field :configuration,    :workbench_tool_configuration, description: "tool configuration"
    field :mcp_server,       :mcp_server, resolve: dataloader(Deployments), description: "the mcp server for this tool"
    field :cloud_connection, :cloud_connection, resolve: dataloader(Deployments), description: "the cloud connection bound to this tool"

    timestamps()
  end

  object :workbench_tool_configuration do
    field :http,      :workbench_tool_http_configuration, description: "http tool configuration"
    field :elastic,   :workbench_tool_elastic_connection, description: "elasticsearch connection (no secrets)"
    field :prometheus, :workbench_tool_prometheus_connection, description: "prometheus connection (no secrets)"
    field :loki,      :workbench_tool_loki_connection, description: "loki connection (no secrets)"
    field :splunk,    :workbench_tool_splunk_connection, description: "splunk connection (no secrets)"
    field :tempo,     :workbench_tool_tempo_connection, description: "tempo connection (no secrets)"
    field :jaeger,    :workbench_tool_jaeger_connection, description: "jaeger connection (no secrets)"
    field :datadog,   :workbench_tool_datadog_connection, description: "datadog connection (no secrets)"
    field :dynatrace, :workbench_tool_dynatrace_connection, description: "dynatrace connection (no secrets)"
    field :cloudwatch, :workbench_tool_cloudwatch_connection, description: "cloudwatch connection (no secrets)"
    field :azure,     :workbench_tool_azure_connection, description: "azure monitor connection (no secrets)"
    field :linear,    :workbench_tool_linear_connection, description: "linear connection (no secrets)"
    field :atlassian, :workbench_tool_atlassian_connection, description: "atlassian connection (no secrets)"
  end

  object :workbench_tool_elastic_connection do
    field :url,      non_null(:string), description: "elasticsearch base url (credentials never exposed)"
    field :index,    non_null(:string), description: "elasticsearch index"
    field :username, non_null(:string), description: "basic auth username"
  end

  object :workbench_tool_prometheus_connection do
    field :url,       :string, description: "prometheus base url"
    field :username,  :string, description: "basic auth username"
    field :tenant_id, :string, description: "optional tenant id"
  end

  object :workbench_tool_loki_connection do
    field :url,       :string, description: "loki base url"
    field :username,  :string, description: "basic auth username"
    field :tenant_id, :string, description: "optional tenant id"
  end

  object :workbench_tool_tempo_connection do
    field :url,       :string, description: "tempo base url"
    field :username,  :string, description: "basic auth username"
    field :tenant_id, :string, description: "optional tenant id"
  end

  object :workbench_tool_jaeger_connection do
    field :url,      :string, description: "jaeger base url"
    field :username, :string, description: "basic auth username"
  end

  object :workbench_tool_splunk_connection do
    field :url,       :string, description: "splunk base url"
    field :username,  :string, description: "basic auth username"
  end

  object :workbench_tool_datadog_connection do
    field :site, :string, description: "datadog site (API/app keys never exposed)"
  end

  object :workbench_tool_dynatrace_connection do
    field :url, :string, description: "dynatrace base url (credentials never exposed)"
  end

  object :workbench_tool_cloudwatch_connection do
    field :region, :string, description: "aws region"
    field :log_group_names, list_of(:string), description: "default log groups for logs insights queries"
    field :role_arn, :string, description: "assumed role ARN when configured"
    field :role_session_name, :string, description: "assume-role session name"
  end

  object :workbench_tool_azure_connection do
    field :subscription_id, :string, description: "azure subscription id"
    field :tenant_id,       :string, description: "azure tenant id"
    field :client_id,       :string, description: "azure client id"
  end

  object :workbench_tool_linear_connection do
    field :url, non_null(:string), resolve: fn _, _ -> {:ok, "https://mcp.linear.app/mcp"} end,
      description: "static MCP URL for Linear"
  end

  object :workbench_tool_atlassian_connection do
    field :url, non_null(:string), resolve: fn _, _ -> {:ok, "https://mcp.atlassian.com/v1/mcp"} end,
      description: "static MCP URL for Atlassian/Jira (credentials never exposed)"
    field :email, :string, description: "atlassian account email for use with PAT authentication"
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

  object :workbench_text_stream do
    field :activity_id, :id
    field :text,        :string
  end

  connection node_type: :workbench
  connection node_type: :workbench_tool
  connection node_type: :workbench_job
  connection node_type: :workbench_job_activity
  connection node_type: :workbench_job_thought
  connection node_type: :workbench_cron
  connection node_type: :workbench_prompt
  connection node_type: :workbench_skill
  connection node_type: :workbench_eval_result
  connection node_type: :workbench_webhook

  delta :workbench_job
  delta :workbench_job_activity
  delta :workbench_job_thought

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

    field :workbench_job_activity, :workbench_job_activity do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :read
      arg :id, non_null(:id)

      resolve &Deployments.workbench_job_activity/2
    end

    connection field :workbench_alerts, node_type: :alert do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :read

      resolve &Deployments.all_workbench_alerts/2
    end

    connection field :workbench_issues, node_type: :issue do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :read

      resolve &Deployments.all_workbench_issues/2
    end

    field :average_workbench_eval_results, list_of(:workbench_eval_results_workbench_average) do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :read
      arg :period, :eval_results_period

      resolve &Deployments.average_workbench_eval_results/2
    end

    field :average_eval_results, list_of(:workbench_eval_results_average) do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :read
      arg :period, :eval_results_period

      resolve &Deployments.average_eval_results/2
    end

    field :workbench_pull_requests, non_null(:integer) do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :read

      resolve &Deployments.workbench_pull_requests/2
    end

    field :workbench_pr_merge_rates, list_of(:workbench_pr_merge_rate_entry) do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :read
      arg :period, :eval_results_period

      resolve &Deployments.workbench_pr_merge_rate/2
    end

    field :workbench_pr_merge_rates_by_workbench, list_of(:workbench_pr_merge_rate_by_workbench_entry) do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :read
      arg :period, :eval_results_period

      resolve &Deployments.workbench_pr_merge_rate_by_workbench/2
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

    field :create_workbench_cron, :workbench_cron do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :write
      arg :workbench_id, non_null(:id), description: "the workbench to create a cron for"
      arg :attributes, non_null(:workbench_cron_attributes)

      resolve &Deployments.create_workbench_cron/2
    end

    field :update_workbench_cron, :workbench_cron do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :write
      arg :id, non_null(:id)
      arg :attributes, non_null(:workbench_cron_attributes)

      resolve &Deployments.update_workbench_cron/2
    end

    field :delete_workbench_cron, :workbench_cron do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :write
      arg :id, non_null(:id)

      resolve &Deployments.delete_workbench_cron/2
    end

    @desc "Fetches a workbench cron by id. Requires read access to the workbench."
    field :workbench_cron, :workbench_cron do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :read
      arg :id, non_null(:id)

      resolve &Deployments.workbench_cron/2
    end

    @desc "Creates a saved prompt for a workbench. Requires read access to the workbench."
    field :create_workbench_prompt, :workbench_prompt do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :write
      arg :workbench_id, non_null(:id), description: "the workbench to save a prompt for"
      arg :attributes, non_null(:workbench_prompt_attributes)

      resolve &Deployments.create_workbench_prompt/2
    end

    @desc "Updates a saved workbench prompt. Requires read access to the workbench."
    field :update_workbench_prompt, :workbench_prompt do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :write
      arg :id, non_null(:id)
      arg :attributes, non_null(:workbench_prompt_attributes)

      resolve &Deployments.update_workbench_prompt/2
    end

    @desc "Deletes a saved workbench prompt. Requires read access to the workbench."
    field :delete_workbench_prompt, :workbench_prompt do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :write
      arg :id, non_null(:id)

      resolve &Deployments.delete_workbench_prompt/2
    end

    @desc "Creates a saved skill for a workbench. Requires write access to the workbench."
    field :create_workbench_skill, :workbench_skill do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :write
      arg :workbench_id, non_null(:id), description: "the workbench to save a skill for"
      arg :attributes, non_null(:workbench_skill_attributes)

      resolve &Deployments.create_workbench_skill/2
    end

    @desc "Updates a saved workbench skill. Requires write access to the workbench."
    field :update_workbench_skill, :workbench_skill do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :write
      arg :id, non_null(:id)
      arg :attributes, non_null(:workbench_skill_attributes)

      resolve &Deployments.update_workbench_skill/2
    end

    @desc "Deletes a saved workbench skill. Requires write access to the workbench."
    field :delete_workbench_skill, :workbench_skill do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :write
      arg :id, non_null(:id)

      resolve &Deployments.delete_workbench_skill/2
    end

    @desc "Creates the eval configuration for a workbench (at most one per workbench). Requires write access to the workbench."
    field :create_workbench_eval, :workbench_eval do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :write
      arg :workbench_id, non_null(:id), description: "the workbench to create an eval for"
      arg :attributes, non_null(:workbench_eval_attributes)

      resolve &Deployments.create_workbench_eval/2
    end

    @desc "Updates the eval configuration for a workbench. Requires write access to the workbench."
    field :update_workbench_eval, :workbench_eval do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :write
      arg :id, non_null(:id)
      arg :attributes, non_null(:workbench_eval_attributes)

      resolve &Deployments.update_workbench_eval/2
    end

    @desc "Deletes the eval configuration for a workbench. Requires write access to the workbench."
    field :delete_workbench_eval, :workbench_eval do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :write
      arg :id, non_null(:id)

      resolve &Deployments.delete_workbench_eval/2
    end

    field :create_workbench_webhook, :workbench_webhook do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :write
      arg :workbench_id, non_null(:id), description: "the workbench to create a webhook for"
      arg :attributes, non_null(:workbench_webhook_attributes)

      resolve &Deployments.create_workbench_webhook/2
    end

    @desc "Fetches a workbench webhook by id. Requires read access to the workbench."
    field :get_workbench_webhook, :workbench_webhook do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :read
      arg :id, non_null(:id)

      resolve &Deployments.get_workbench_webhook/2
    end

    field :update_workbench_webhook, :workbench_webhook do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :write
      arg :id, non_null(:id)
      arg :attributes, non_null(:workbench_webhook_attributes)

      resolve &Deployments.update_workbench_webhook/2
    end

    field :delete_workbench_webhook, :workbench_webhook do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :write
      arg :id, non_null(:id)

      resolve &Deployments.delete_workbench_webhook/2
    end

    @desc "Creates a new workbench job. Requires read access to the workbench."
    field :create_workbench_job, :workbench_job do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :write
      arg :workbench_id, non_null(:id), description: "the workbench to create a job for"
      arg :attributes,   non_null(:workbench_job_attributes), description: "job attributes (e.g. prompt)"

      resolve &Deployments.create_workbench_job/2
    end

    field :create_workbench_message, :workbench_job_activity do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :write
      arg :job_id, non_null(:id), description: "the job to create a message for"
      arg :attributes, non_null(:workbench_message_attributes), description: "message attributes (e.g. prompt)"

      resolve &Deployments.create_workbench_message/2
    end

    @desc "Updates only the topology field on the job's result. Requires read access to the job's workbench; only the job owner may update."
    field :update_workbench_job, :workbench_job do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :write
      arg :job_id,     non_null(:id), description: "the workbench job to update"
      arg :attributes, non_null(:workbench_job_update_attributes),
        description: "attributes to update on the job (only the result topology is accepted)"

      resolve &Deployments.update_workbench_job/2
    end

    @desc "Cancels a workbench job. Allowed for the job owner or users with write access to the workbench."
    field :cancel_workbench_job, :workbench_job do
      middleware Authenticated
      middleware Scope,
        resource: :workbench,
        action: :write
      arg :job_id, non_null(:id), description: "the workbench job to cancel"

      resolve &Deployments.cancel_workbench_job/2
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

    field :workbench_job_thought_delta, :workbench_job_thought_delta do
      arg :job_id, non_null(:id)

      config fn %{job_id: job_id}, ctx ->
        with {:ok, _} <- Deployments.workbench_job(%{id: job_id}, ctx),
          do: {:ok, topic: "workbench_jobs:#{job_id}:thoughts"}
      end
    end

    field :workbench_job_progress, :workbench_job_progress do
      arg :job_id, non_null(:id)

      config fn %{job_id: job_id}, ctx ->
        with {:ok, _} <- Deployments.workbench_job(%{id: job_id}, ctx),
          do: {:ok, topic: "workbench_jobs:#{job_id}:progress"}
      end
    end

    field :workbench_text_stream, :workbench_text_stream do
      arg :job_id, non_null(:id)

      config fn %{job_id: job_id}, ctx ->
        with {:ok, _} <- Deployments.workbench_job(%{id: job_id}, ctx),
          do: {:ok, topic: "workbench_jobs:#{job_id}:text_stream"}
      end
    end

    field :workbench_canvas_stream, :workbench_canvas_block do
      arg :activity_id, :id, description: "stream only events within the given activity"
      arg :job_id,      non_null(:id), description: "stream all events within the given job"

      config fn
        %{activity_id: activity_id, job_id: job_id}, ctx when is_binary(activity_id) ->
          with {:ok, _} <- Deployments.workbench_job(%{id: job_id}, ctx),
            do: {:ok, topic: "workbench_jobs:#{job_id}:#{activity_id}:canvas_stream"}
        %{job_id: job_id}, ctx ->
          with {:ok, _} <- Deployments.workbench_job(%{id: job_id}, ctx),
            do: {:ok, topic: "workbench_jobs:#{job_id}:canvas_stream"}
      end
    end
  end
end
