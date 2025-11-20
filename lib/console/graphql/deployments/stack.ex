defmodule Console.GraphQl.Deployments.Stack do
  use Console.GraphQl.Schema.Base
  alias Console.Schema.{Stack, RunStep, StackRun}
  alias Console.Deployments.Stacks
  alias Console.GraphQl.Resolvers.{Deployments, User}

  ecto_enum :stack_status,       Stack.Status
  ecto_enum :stack_type,         Stack.Type
  ecto_enum :step_status,        RunStep.Status
  ecto_enum :step_stage,         RunStep.Stage
  ecto_enum :policy_engine_type, Stack.PolicyEngine.Type
  ecto_enum :approval_result,    StackRun.ApprovalResult

  input_object :stack_attributes do
    field :name,           non_null(:string), description: "the name of the stack"
    field :type,           non_null(:stack_type), description: "A type for the stack, specifies the tool to use to apply it"
    field :repository_id,  non_null(:id), description: "The repository to source IaC from"
    field :cluster_id,     non_null(:id), description: "The cluster on which the terraform will be applied"
    field :git,            non_null(:git_ref_attributes), description: "reference w/in the repository where the IaC lives"
    field :job_spec,       :gate_job_attributes, description: "optional k8s job configuration for the job that will apply this stack"
    field :configuration,  :stack_configuration_attributes, description: "version/image config for the tool you're using"
    field :approval,       :boolean, description: "whether to require approval"
    field :manage_state,   :boolean, description: "whether you want Plural to manage your terraform state for this stack"
    field :workdir,        :string, description: "the subdirectory you want to run the stack's commands w/in"
    field :actor_id,       :id, description: "user id to use for default Plural authentication in this stack"
    field :project_id,     :id, description: "the project id this stack will belong to"
    field :parent_id,      :id, description: "the parent service this stack was created w/in"
    field :connection_id,  :id, description: "id of an scm connection to use for pr callbacks"
    field :definition_id,  :id, description: "the id of a stack definition to use"
    field :cron,           :stack_cron_attributes, description: "a cron to spawn runs for this stack"
    field :variables,      :json, description: "arbitrary variables to pass into the stack"
    field :policy_engine,  :policy_engine_attributes
    field :agent_id,       :string, description: "the agent id this stack is associated with"
    field :interval,       :string, description: "the interval at which the stack will be reconciled, default is 5m"

    field :read_bindings,  list_of(:policy_binding_attributes)
    field :write_bindings, list_of(:policy_binding_attributes)

    field :tags,               list_of(:tag_attributes)
    field :files,              list_of(:stack_file_attributes)
    field :environment,        list_of(:stack_environment_attributes)
    field :observable_metrics, list_of(:observable_metric_attributes)
  end

  input_object :stack_configuration_attributes do
    field :image,       :string, description: "optional custom image you might want to use"
    field :version,     :string, description: "the semver of the tool you wish to use"
    field :tag,         :string, description: "the docker image tag you wish to use if you're customizing the version"
    field :hooks,       list_of(:stack_hook_attributes), description: "the hooks to customize execution for this stack"
    field :terraform,   :terraform_configuration_attributes, description: "the terraform configuration for this stack"
    field :ansible,     :ansible_configuration_attributes, description: "the ansible configuration for this stack"
    field :ai_approval, :ai_approval_attributes, description: "the ai approval configuration for this stack"
  end

  input_object :stack_overrides_attributes do
    field :terraform, :terraform_configuration_attributes, description: "the terraform configuration for this stack"
  end

  input_object :stack_hook_attributes do
    field :cmd,          non_null(:string), description: "a script hook to run at a stage"
    field :args,         list_of(:string), description: "args for `cmd`"
    field :after_stage,  non_null(:step_stage), description: "the stage to run this hook before"
  end

  input_object :terraform_configuration_attributes do
    field :parallelism, :integer, description: "equivalent to the -parallelism flag in terraform"
    field :refresh,     :boolean, description: "equivalent to the -refresh flag in terraform"
  end

  input_object :ansible_configuration_attributes do
    field :playbook, :string, description: "the playbook to run"
    field :inventory, :string, description: "The ansible inventory file to use. we recommend checking this into git alongside your playbook files"
    field :additional_args, list_of(:string), description: "additional args for the playbook"
  end

  input_object :ai_approval_attributes do
    field :enabled,       non_null(:boolean)
    field :ignore_cancel, non_null(:boolean)
    field :git,           non_null(:git_ref_attributes)
    field :file,          non_null(:string)
  end

  input_object :stack_cron_attributes do
    field :crontab,      non_null(:string), description: "the crontab to use for spawning stack runs"
    field :auto_approve, :boolean, description: "whether you want to auto approve any changes spawned by the cron worker"
    field :overrides,    :stack_overrides_attributes, description: "configuration overrides for the cron run"
    field :track_ref,    :string, description: "whether to track the stack's ref exactly on cron runs versus the last detected commit"
  end

  input_object :policy_engine_attributes do
    field :type,         non_null(:policy_engine_type), description: "the policy engine to use with this stack"
    field :max_severity, :vuln_severity, description: "the maximum allowed severity without failing the stack run"
  end

  input_object :stack_run_attributes do
    field :status,              non_null(:stack_status), description: "The status of this run"
    field :job_ref,             :namespaced_name, description: "the reference to the k8s job running this stack"
    field :state,               :stack_state_attributes, description: "The state from this runs plan or apply"
    field :output,              list_of(:stack_output_attributes), description: "Output generated by this run"
    field :errors,              list_of(:service_error_attributes), description: "Any errors detected when trying to run this stack"
    field :cancellation_reason, :string, description: "Why you decided to cancel this run"
    field :violations,          list_of(:stack_policy_violation_attributes), description: "the violations detected by the policy engine"
  end

  input_object :run_step_attributes do
    field :status, non_null(:step_status)
  end

  input_object :run_log_attributes do
    field :logs, non_null(:string)
  end

  input_object :stack_output_attributes do
    field :name,   non_null(:string)
    field :value,  non_null(:string)
    field :secret, :boolean
  end

  input_object :stack_environment_attributes do
    field :name,   non_null(:string)
    field :value,  non_null(:string)
    field :secret, :boolean
  end

  input_object :stack_file_attributes do
    field :path,    non_null(:string)
    field :content, non_null(:string)
  end

  input_object :stack_state_attributes do
    field :plan,  :string
    field :state, list_of(:stack_state_resource_attributes)
  end

  input_object :stack_state_resource_attributes do
    field :identifier,    non_null(:string), description: "a string identifier for this resource, different tools will have different conventions"
    field :resource,      non_null(:string), description: "a string name of the resource type"
    field :name,          non_null(:string), description: "the name of the resource within that type"
    field :configuration, :json, description: "arbitrary configuration used to create the resource"
    field :links,         list_of(:string), description: "identifiers this resource is linked to for graphing in the UI"
  end

  input_object :custom_stack_run_attributes do
    field :name,          non_null(:string), description: "human readable name for this custom run"
    field :documentation, :string, description: "extended documentation to explain what this will do"
    field :stack_id,      :id, description: "the stack to attach it to"
    field :commands,      list_of(:command_attributes), description: "the commands for this custom run"
    field :configuration, list_of(:pr_configuration_attributes), description: "self-service configuration which will be presented in UI before triggering"
  end

  input_object :command_attributes do
    field :cmd,  non_null(:string)
    field :args, list_of(:string)
    field :dir,  :string
  end

  input_object :stack_definition_attributes do
    field :name,          non_null(:string)
    field :description,   :string
    field :steps,         list_of(:custom_step_attributes)
    field :configuration, :stack_configuration_attributes
  end

  input_object :custom_step_attributes do
    field :stage,            :step_stage
    field :cmd,              non_null(:string)
    field :args,             list_of(:string)
    field :require_approval, :boolean
  end

  input_object :stack_policy_violation_attributes do
    field :severity,      non_null(:vuln_severity)
    field :policy_id,     non_null(:string)
    field :policy_url,    :string
    field :policy_module, :string
    field :title,         non_null(:string)
    field :description,   :string
    field :resolution,    :string
    field :causes,        list_of(:stack_violation_cause_attributes)
  end

  input_object :stack_violation_cause_attributes do
    field :resource, non_null(:string)
    field :start,    non_null(:integer)
    field :end,      non_null(:integer)
    field :filename, :string

    field :lines, list_of(:stack_violation_cause_line_attributes)
  end

  input_object :stack_violation_cause_line_attributes do
    field :content, non_null(:string)
    field :line,    non_null(:integer)
    field :first,   :boolean
    field :last,    :boolean
  end

  object :infrastructure_stack do
    field :id,                  :id
    field :name,                non_null(:string), description: "the name of the stack"
    field :type,                non_null(:stack_type), description: "A type for the stack, specifies the tool to use to apply it"
    field :git,                 non_null(:git_ref), description: "reference w/in the repository where the IaC lives"
    field :paused,              :boolean, description: "whether the stack is actively tracking changes in git"
    field :status,              non_null(:stack_status), description: "The status of the last run of the stack"
    field :job_spec,            :job_gate_spec, description: "optional k8s job configuration for the job that will apply this stack"
    field :policy_engine,       :policy_engine
    field :agent_id,            :string, description: "the agent id this stack is associated with"
    field :interval,            :string, description: "the interval at which the stack will be reconciled, default is 5m"
    field :next_poll_at,        :datetime, description: "the next time the stack will be reconciled"

    @desc "version/image config for the tool you're using"
    field :configuration,       non_null(:stack_configuration), resolve: fn
      %{configuration: %{} = conf}, _, _ -> {:ok, conf}
      _, _, _ -> {:ok, %{hooks: []}}
    end

    field :approval,            :boolean, description: "whether to require approval"
    field :deleted_at,          :datetime, description: "whether this stack was previously deleted and is pending cleanup"
    field :cancellation_reason, :string, description: "why this run was cancelled"
    field :workdir,             :string, description: "the subdirectory you want to run the stack's commands w/in"
    field :manage_state,        :boolean, description: "whether you want Plural to manage the state of this stack"
    field :variables,           :map, description: "Arbitrary variables to add to a stack run", resolve: fn
      parent, _, context -> Deployments.safe_field(parent, :variables, context)
    end

    connection field :runs, node_type: :stack_run do
      arg :pull_request_id, :id
      resolve &Deployments.list_stack_runs/3
    end

    connection field :pull_requests, node_type: :pull_request do
      resolve &Deployments.list_prs_for_stack/3
    end

    field :files, list_of(:stack_file), resolve: filter_loader(dataloader(Deployments), &Deployments.safe_stack_field/3), description: "files bound to a run of this stack"
    field :environment, list_of(:stack_environment), resolve: filter_loader(dataloader(Deployments), &Deployments.safe_stack_outputs/3), description: "environment variables for this stack"

    field :observable_metrics, list_of(:observable_metric), resolve: dataloader(Deployments), description: "a list of metrics to poll to determine if a stack run should be cancelled"

    field :delete_run, :stack_run, resolve: dataloader(Deployments), description: "the run that physically destroys the stack"
    field :output,     list_of(:stack_output),
      resolve: filter_loader(dataloader(Deployments), &Deployments.safe_stack_outputs/3),
      description: "the most recent output for this stack"
    field :state,      :stack_state, resolve: filter_loader(dataloader(Deployments), &Deployments.safe_stack_field/3), description: "the most recent state of this stack"

    field :project,    :project,            resolve: dataloader(Deployments), description: "The project this stack belongs to"
    field :cluster,    :cluster,            resolve: dataloader(Deployments), description: "the cluster this stack runs on"
    field :repository, :git_repository,     resolve: dataloader(Deployments), description: "the git repository you're sourcing IaC from"
    field :definition, :stack_definition,   resolve: dataloader(Deployments), description: "the stack definition in-use by this stack"
    field :cron,       :stack_cron,         resolve: dataloader(Deployments), description: "a cron to spawn runs for this stack"
    field :parent,     :service_deployment, resolve: dataloader(Deployments), description: "the service this stack was created w/in"
    field :insight,    :ai_insight,         resolve: dataloader(Deployments), description: "an insight explaining the state of this stack"

    field :actor, :user, resolve: dataloader(User), description: "the actor of this stack (defaults to root console user)"

    connection field :custom_stack_runs, node_type: :custom_stack_run do
      resolve &Deployments.list_custom_runs/3
    end

    field :tags, list_of(:tag), resolve: dataloader(Deployments), description: "key/value tags to filter stacks"

    field :read_bindings,  list_of(:policy_binding), resolve: dataloader(Deployments)
    field :write_bindings, list_of(:policy_binding), resolve: dataloader(Deployments)

    timestamps()
  end

  object :stack_cron do
    field :crontab, non_null(:string), description: "the crontab used to independently spawn runs for this stack"
    field :auto_approve, :boolean, description: "whether you want any cron-derived runs to automatically approve changes"
    field :overrides,    :stack_overrides, description: "configuration overrides for the cron run"
    field :track_ref,    :string, description: "whether to track the stack's ref exactly on cron runs versus the last detected commit"
  end

  @desc "grab-bag of state configuration urls for supported tools"
  object :state_urls do
    field :terraform, :terraform_state_urls
  end

  @desc "Configuration overrides for a stack cron run"
  object :stack_overrides do
    field :terraform, :terraform_configuration, description: "the terraform configuration for this stack"
  end

  @desc "Urls for configuring terraform HTTP remote state"
  object :terraform_state_urls do
    field :address, :string, description: "GET and POST urls for uploadnig state"
    field :lock,    :string, description: "POST url to lock state"
    field :unlock,  :string, description: "POST url to unlock state"
  end

  @desc "temporary credentials for the user attached to this stack"
  object :plural_creds do
    field :token, :string, description: "authentication token to use for gql requests"
    field :url,   :string, description: "the api url of this instance"
  end

  object :stack_configuration do
    field :image,     :string, description: "optional custom image you might want to use"
    field :version,   :string, description: "the semver of the tool you wish to use"
    field :tag,       :string, description: "the docker image tag you wish to use if you're customizing the version"
    field :hooks,     list_of(:stack_hook), description: "the hooks to customize execution for this stack"
    field :terraform, :terraform_configuration, description: "the terraform configuration for this stack"
    field :ansible,   :ansible_configuration, description: "the ansible configuration for this stack"
  end

  @desc "Configuration for applying policy enforcement to a stack"
  object :policy_engine do
    field :type,         non_null(:policy_engine_type), description: "the policy engine to use with this stack"
    field :max_severity, :vuln_severity, description: "the maximum allowed severity without failing the stack run"
  end

  object :stack_hook do
    field :cmd,          non_null(:string), description: "a script hook to run at a stage"
    field :args,         list_of(:string), description: "args for `cmd`"
    field :after_stage,  non_null(:step_stage), description: "the stage to run this hook before"
  end

  object :terraform_configuration do
    field :parallelism, :integer, description: "equivalent to the -parallelism flag in terraform"
    field :refresh,     :boolean, description: "equivalent to the -refresh flag in terraform"
  end

  object :ansible_configuration do
    field :playbook,  :string, description: "The playbook to run"
    field :inventory, :string, description: "The ansible inventory file to use. we recommend checking this into git alongside your playbook files"
    field :additional_args, list_of(:string), description: "Additional args for the playbook"
  end

  object :ai_approval_configuration do
    field :enabled,       :boolean
    field :ignore_cancel, :boolean
    field :git,           :git_ref
    field :file,          :string
  end

  object :stack_run do
    field :id,                  non_null(:id)
    field :status,              non_null(:stack_status), description: "The status of this run"
    field :type,                non_null(:stack_type), description: "A type for the stack, specifies the tool to use to apply it"
    field :git,                 non_null(:git_ref), description: "reference w/in the repository where the IaC lives"
    field :dry_run,             non_null(:boolean), description: "whether this run is a dry run"
    field :job_spec,            :job_gate_spec,
      description: "optional k8s job configuration for the job that will apply this stack",
      resolve: &Deployments.job_spec/3
    field :policy_engine,       :policy_engine

    @desc "version/image config for the tool you're using"
    field :configuration,       non_null(:stack_configuration), resolve: fn
      %{configuration: %{} = conf}, _, _ -> {:ok, conf}
      _, _, _ -> {:ok, %{hooks: []}}
    end

    field :approval,            :boolean, description: "whether to require approval"
    field :message,             :string, description: "the commit message"
    field :approved_at,         :datetime, description: "when this run was approved"
    field :workdir,             :string, description: "the subdirectory you want to run the stack's commands w/in"
    field :manage_state,        :boolean, description: "whether you want Plural to manage the state of this stack"
    field :approval_result,     :stack_run_approval_result, description: "the result of the approval decision by the ai"
    field :variables,           :map, description: "Arbitrary variables to add to a stack run", resolve: fn
      parent, _, context -> Deployments.safe_field(parent, :variables, context)
    end

    field :cancellation_reason, :string, description: "explanation for why this run was cancelled"

    field :state_urls, :state_urls, resolve: fn
      run, _, _ -> {:ok, Stacks.state_urls(run)}
    end

    @desc "the kubernetes job for this run (useful for debugging if issues arise)"
    field :job, :job do
      resolve fn run, _, _ -> Console.Deployments.Stacks.run_job(run) end
      middleware ErrorHandler
    end

    field :plural_creds, :plural_creds, resolve: &Deployments.plural_creds/3, description: "temporary plural creds usable for terraform authentication"

    field :tarball, non_null(:string), resolve: &Deployments.stack_tarball/3, description: "https url to fetch the latest tarball of stack IaC"

    field :pull_request, :pull_request, resolve: dataloader(Deployments), description: "the pull request this stack belongs to"

    field :approver, :user, resolve: dataloader(User), description: "the approver of this job"
    field :actor, :user, resolve: dataloader(User), description: "the actor of this run (defaults to root console user)"

    field :steps, list_of(:run_step), resolve: dataloader(Deployments), description: "The steps to perform when running this stack"

    field :files, list_of(:stack_file),
      resolve: filter_loader(dataloader(Deployments), &Deployments.safe_stack_field/3),
      description: "files bound to a run of this stack"
    field :environment, list_of(:stack_environment),
      resolve: filter_loader(dataloader(Deployments), &Deployments.safe_stack_outputs/3),
      description: "environment variables for this stack"

    field :stack,   :infrastructure_stack, resolve: dataloader(Deployments), description: "the stack attached to this run"
    field :output,  list_of(:stack_output),
      resolve: filter_loader(dataloader(Deployments), &Deployments.safe_stack_outputs/3),
      description: "the most recent output for this stack"
    field :state,   :stack_state,
      resolve: filter_loader(dataloader(Deployments), &Deployments.safe_stack_field/3),
      description: "the most recent state of this stack"
    field :errors,  list_of(:service_error),
      resolve: dataloader(Deployments),
      description: "a list of errors generated by the deployment operator"
    field :insight, :ai_insight, resolve: dataloader(Deployments), description: "an insight explaining the state of this stack run"

    field :cluster,         :cluster, resolve: dataloader(Deployments), description: "the cluster this stack runs on"
    field :repository,      :git_repository, resolve: dataloader(Deployments), description: "the git repository you're sourcing IaC from"
    field :violations,      list_of(:stack_policy_violation), resolve: dataloader(Deployments), description: "policy violations for this stack"

    timestamps()
  end

  object :run_step do
    field :id,               non_null(:id)
    field :status,           non_null(:step_status)
    field :stage,            non_null(:step_stage)
    field :name,             non_null(:string)
    field :cmd,              non_null(:string)
    field :args,             list_of(non_null(:string))
    field :require_approval, :boolean
    field :index,            non_null(:integer)

    field :logs, list_of(:run_logs), resolve: dataloader(Deployments)

    timestamps()
  end

  object :run_logs do
    field :id,   non_null(:id)
    field :logs, non_null(:string)

    timestamps()
  end

  object :stack_output do
    field :name,   non_null(:string)
    field :value,  non_null(:string)
    field :secret, :boolean
  end

  object :stack_environment do
    field :name,   non_null(:string)
    field :value,  non_null(:string)
    field :secret, :boolean
  end

  object :stack_file do
    field :path,    non_null(:string)
    field :content, non_null(:string)
  end

  object :stack_state do
    field :id,    non_null(:id)
    field :plan,  :string
    field :state, list_of(:stack_state_resource)

    field :insight, :ai_insight, resolve: dataloader(Deployments),
      description: "an insight explaining the state of this stack state, eg the terraform plan it represents"

    timestamps()
  end

  object :stack_state_resource do
    field :identifier,    non_null(:string), description: "a string identifier for this resource, different tools will have different conventions"
    field :resource,      non_null(:string), description: "a string name of the resource type"
    field :name,          non_null(:string), description: "the name of the resource within that type"
    field :configuration, :map, description: "arbitrary configuration used to create the resource"
    field :links,         list_of(:string), description: "identifiers this resource is linked to for graphing in the UI"
  end

  object :custom_stack_run do
    field :id,            non_null(:id)
    field :name,          non_null(:string), description: "Name of the custom stack run"
    field :documentation, :string, description: "Documentation to explain to users what this will do"
    field :commands,      list_of(:stack_command), description: "the list of commands that will be executed"
    field :configuration, list_of(:pr_configuration), description: "self-service configuration fields presented in the UI to configure how this run executes"

    field :stack, :infrastructure_stack, resolve: dataloader(Deployments)

    timestamps()
  end

  object :stack_definition do
    field :id,          non_null(:id)
    field :name,        non_null(:string)
    field :description, :string

    field :configuration, non_null(:stack_configuration)

    field :steps, list_of(:custom_run_step)

    timestamps()
  end

  object :stack_run_approval_result do
    field :reason, :string, description: "the reason for the approval decision by the ai"
    field :result, :approval_result, description: "the result of the approval decision by the ai"
  end

  object :custom_run_step do
    field :cmd,              non_null(:string)
    field :args,             list_of(:string)
    field :stage,            non_null(:step_stage)
    field :require_approval, :boolean
  end

  object :stack_command do
    field :cmd,  non_null(:string), description: "the executable to call"
    field :args, list_of(:string), description: "cli args to pass"
    field :dir,  :string, description: "working directory for this command (not required)"
  end

  object :stack_policy_violation do
    field :id,              non_null(:id)
    field :severity,        non_null(:vuln_severity)
    field :policy_id,       non_null(:string)
    field :policy_url,      :string
    field :policy_module,   :string
    field :title,           non_null(:string)
    field :description,     :string
    field :resolution,      :string

    field :causes, list_of(:stack_violation_cause), resolve: dataloader(Deployments),
      description: "the causes of this violation line-by-line in code"

    timestamps()
  end

  object :stack_violation_cause do
    field :resource, non_null(:string)
    field :start,    non_null(:integer)
    field :end,      non_null(:integer)
    field :filename, :string

    field :lines, list_of(:stack_violation_cause_line)
  end

  object :stack_violation_cause_line do
    field :content, non_null(:string)
    field :line,    non_null(:integer)
    field :first,   :boolean
    field :last,    :boolean
  end

  connection node_type: :infrastructure_stack
  connection node_type: :stack_run
  connection node_type: :custom_stack_run
  connection node_type: :stack_definition

  delta :run_logs

  object :public_stack_queries do
    field :custom_stack_run, :custom_stack_run do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.resolve_custom_stack_run/2
    end

    connection field :cluster_stack_runs, node_type: :stack_run do
      middleware ClusterAuthenticated

      resolve &Deployments.stack_runs_for_cluster/2
    end

    field :stack_run, :stack_run do
      middleware Authenticated, :cluster
      arg :id, non_null(:id)

      resolve &Deployments.resolve_stack_run/2
    end
  end

  object :public_stack_mutations do
    field :update_stack_run, :stack_run do
      middleware Authenticated, :cluster
      arg :id,         non_null(:id)
      arg :attributes, non_null(:stack_run_attributes)

      resolve &Deployments.update_stack_run/2
    end

    field :complete_stack_run, :stack_run do
      middleware Authenticated, :cluster
      arg :id,         non_null(:id)
      arg :attributes, non_null(:stack_run_attributes)

      resolve &Deployments.complete_stack_run/2
    end

    field :update_run_step, :run_step do
      middleware ClusterAuthenticated
      arg :id,         non_null(:id)
      arg :attributes, non_null(:run_step_attributes)

      resolve &Deployments.update_run_step/2
    end

    field :add_run_logs, :run_logs do
      middleware ClusterAuthenticated
      arg :step_id,    non_null(:id)
      arg :attributes, non_null(:run_log_attributes)

      resolve &Deployments.add_run_logs/2
    end
  end

  object :stack_queries do
    field :infrastructure_stack, :infrastructure_stack do
      middleware Authenticated
      arg :id,   :id
      arg :name, :string

      resolve &Deployments.resolve_stack/2
    end

    field :stack_definition, :stack_definition do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.resolve_stack_definition/2
    end

    connection field :stack_definitions, node_type: :stack_definition do
      middleware Authenticated

      resolve &Deployments.list_stack_definitions/2
    end

    connection field :infrastructure_stacks, node_type: :infrastructure_stack do
      middleware Authenticated
      arg :q,          :string
      arg :project_id, :id
      arg :tag_query,  :tag_query

      resolve &Deployments.list_stacks/2
    end
  end

  object :stack_mutations do
    field :create_stack, :infrastructure_stack do
      middleware Authenticated
      arg :attributes, non_null(:stack_attributes)

      resolve &Deployments.create_stack/2
    end

    field :update_stack, :infrastructure_stack do
      middleware Authenticated
      arg :id,         non_null(:id)
      arg :attributes, non_null(:stack_attributes)

      resolve &Deployments.update_stack/2
    end

    field :delete_stack, :infrastructure_stack do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.delete_stack/2
    end

    field :detach_stack, :infrastructure_stack do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.detach_stack/2
    end

    @desc "un-deletes a stack and cancels the destroy run that was spawned to remove its managed infrastructure"
    field :restore_stack, :infrastructure_stack do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.restore_stack/2
    end

    @desc "refresh the source repo of this stack, and potentially create a fresh run"
    field :kick_stack, :stack_run do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.kick_stack/2
    end

    @desc "refresh the source repo of this stack, and potentially create a fresh run for this pr"
    field :kick_stack_pull_request, :stack_run do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.kick_stack_pr/2
    end

    field :approve_stack_run, :stack_run do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.approve_stack_run/2
    end

    field :restart_stack_run, :stack_run do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.restart_stack_run/2
    end

    field :create_custom_stack_run, :custom_stack_run do
      middleware Authenticated
      arg :attributes, non_null(:custom_stack_run_attributes)

      resolve &Deployments.create_custom_stack_run/2
    end

    field :update_custom_stack_run, :custom_stack_run do
      middleware Authenticated
      arg :id,         non_null(:id)
      arg :attributes, non_null(:custom_stack_run_attributes)

      resolve &Deployments.update_custom_stack_run/2
    end

    field :delete_custom_stack_run, :custom_stack_run do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.delete_custom_stack_run/2
    end

    field :create_stack_definition, :stack_definition do
      middleware Authenticated
      arg :attributes, non_null(:stack_definition_attributes)

      resolve &Deployments.create_stack_definition/2
    end

    field :update_stack_definition, :stack_definition do
      middleware Authenticated
      arg :id,         non_null(:id)
      arg :attributes, non_null(:stack_definition_attributes)

      resolve &Deployments.update_stack_definition/2
    end

    field :delete_stack_definition, :stack_definition do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.delete_stack_definition/2
    end

    @desc "Creates a custom run, with the given command list, to execute w/in the stack's environment"
    field :on_demand_run, :stack_run do
      middleware Authenticated
      arg :stack_id, non_null(:id)
      arg :commands, list_of(:command_attributes)
      arg :context,  :json

      resolve &Deployments.create_stack_run/2
    end

    @desc "start a new run from the newest sha in the stack's run history"
    field :trigger_run, :stack_run do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.trigger_run/2
    end
  end

  object :stack_subscriptions do
    field :run_logs_delta, :run_logs_delta do
      arg :step_id, non_null(:id)

      config fn %{step_id: step_id}, ctx ->
        with {:ok, step} <- Deployments.resolve_run_step(step_id, ctx),
          do: {:ok, topic: "steps:#{step.id}"}
      end
    end
  end
end
