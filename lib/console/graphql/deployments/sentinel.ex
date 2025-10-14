defmodule Console.GraphQl.Deployments.Sentinel do
  use Console.GraphQl.Schema.Base
  alias Console.Deployments.Sentinels
  alias Console.GraphQl.Resolvers.Deployments

  ecto_enum :sentinel_check_type, Console.Schema.Sentinel.CheckType
  ecto_enum :sentinel_run_status, Console.Schema.SentinelRun.Status
  ecto_enum :sentinel_run_job_status, Console.Schema.SentinelRunJob.Status
  ecto_enum :sentinel_run_job_format, Console.Schema.SentinelRunJob.Format

  input_object :sentinel_attributes do
    field :name,          :string, description: "the name of the sentinel"
    field :description,   :string, description: "the description of the sentinel"
    field :repository_id, :id, description: "the repository to use for this sentinel"
    field :project_id,    :id, description: "the project to use for this sentinel"
    field :git,           :git_ref_attributes, description: "the git repository to use for this sentinel"
    field :checks,        list_of(:sentinel_check_attributes), description: "the checks to run for this sentinel"
  end

  input_object :sentinel_check_attributes do
    field :type,          non_null(:sentinel_check_type), description: "the type of check to run"
    field :name,          non_null(:string), description: "the name of the check"
    field :rule_file,     :string, description: "the rule file to use for this check"
    field :configuration, :sentinel_check_configuration_attributes, description: "the configuration to use for this check"
  end

  input_object :sentinel_check_configuration_attributes do
    field :log,              :sentinel_check_log_configuration_attributes, description: "the log configuration to use for this check"
    field :kubernetes,       :sentinel_check_kubernetes_configuration_attributes, description: "the kubernetes configuration to use for this check"
    field :integration_test, :sentinel_check_integration_test_configuration_attributes, description: "the integration test configuration to use for this check"
  end

  input_object :sentinel_check_log_configuration_attributes do
    field :namespaces, list_of(:string), description: "the namespaces to run the query against"
    field :query,      non_null(:string), description: "a search query this will run against the logs"
    field :cluster_id, :id, description: "the cluster to run the query against"
    field :duration,   non_null(:string), description: "The duration of the log analysis run"
    field :facets,     list_of(:log_facet_input), description: "the log facets to run the query against"
  end

  input_object :sentinel_check_kubernetes_configuration_attributes do
    field :group,      :string, description: "the api group to use when fetching this resource"
    field :version,    non_null(:string), description: "the api version to use when fetching this resource"
    field :kind,       non_null(:string), description: "the kind to use when fetching this resource"
    field :name,       non_null(:string), description: "the name to use when fetching this resource"
    field :namespace,  :string, description: "the namespace to use when fetching this resource"
    field :cluster_id, non_null(:id), description: "the cluster to run the query against"
  end

  input_object :sentinel_check_integration_test_configuration_attributes do
    field :job,    :gate_job_attributes, description: "the job to run for this check"
    field :distro, :cluster_distro, description: "the distro to run the check on"
    field :tags,   :json, description: "the cluster tags to select where to run this job"
  end

  input_object :sentinel_run_job_update_attributes do
    field :status,    :sentinel_run_job_status, description: "the status of the job"
    field :reference, :namespaced_name, description: "the reference to the job that was run"
    field :output,    :string, description: "the output of the job"
  end

  object :sentinel do
    field :id,           non_null(:string), description: "the id of the sentinel"
    field :name,         non_null(:string), description: "the name of the sentinel"
    field :description, :string, description: "the description of the sentinel"
    field :status,      :sentinel_run_status, description: "the status of the sentinel's last run"
    field :git,         :git_ref, description: "the git location for rules files from the associated repository"
    field :repository,  :git_repository, resolve: dataloader(Deployments), description: "the git repository to use for fetching rules files for AI enabled analysis"
    field :project,     :project, resolve: dataloader(Deployments), description: "the project of this sentinel"
    field :checks,      list_of(:sentinel_check), description: "the checks to run for this sentinel"
    field :last_run_at, :datetime, description: "the last time this sentinel was run"

    @desc "the runs of this sentinel, do not query w/in list fields"
    connection field :runs, node_type: :sentinel_run do
      resolve &Deployments.sentinel_runs/3
    end

    timestamps()
  end

  object :sentinel_check do
    field :id,            non_null(:string), description: "the id of the check"
    field :name,          non_null(:string), description: "the name of the check"
    field :type,          non_null(:sentinel_check_type), description: "the type of check to run"
    field :rule_file,     :string, description: "the rule file to use for this check"
    field :configuration, :sentinel_check_configuration, description: "the configuration to use for this check"
  end

  object :sentinel_check_configuration do
    field :log,        :sentinel_check_log_configuration, description: "the log configuration to use for this check"
    field :kubernetes, :sentinel_check_kubernetes_configuration, description: "the kubernetes configuration to use for this check"
    field :integration_test, :sentinel_check_integration_test_configuration, description: "the integration test configuration to use for this check"
  end

  object :sentinel_check_log_configuration do
    field :namespaces, list_of(:string), description: "the namespaces to run the query against"
    field :query,      non_null(:string), description: "a search query this will run against the logs"
    field :cluster_id, :id, description: "the cluster to run the query against"
    field :facets,     list_of(:log_facet), description: "the log facets to run the query against"
    field :duration,   non_null(:string), description: "The duration of the log analysis run"
  end

  object :sentinel_check_kubernetes_configuration do
    field :group,     :string, description: "the api group to use when fetching this resource"
    field :version,   non_null(:string), description: "the api version to use when fetching this resource"
    field :kind,      non_null(:string), description: "the kind to use when fetching this resource"
    field :name,      non_null(:string), description: "the name to use when fetching this resource"
    field :namespace, :string, description: "the namespace to use when fetching this resource"
  end

  object :sentinel_check_integration_test_configuration do
    field :job,    :job_gate_spec, description: "the job to run for this check"
    field :distro, :cluster_distro, description: "the distro to run the check on"
    field :tags,   :map, description: "the cluster tags to select where to run this job"
  end

  object :sentinel_run do
    field :id,               non_null(:string), description: "the id of the run"
    field :status,           non_null(:sentinel_run_status), description: "the status of the run"
    field :sentinel,         :sentinel, resolve: dataloader(Deployments), description: "the sentinel that was run"
    field :results,          list_of(:sentinel_run_result), description: "the results of the run"

    connection field :jobs, node_type: :sentinel_run_job do
      resolve &Deployments.sentinel_run_jobs/3
    end

    timestamps()
  end

  object :sentinel_run_result do
    field :name,             :string, description: "the name of the check"
    field :status,           non_null(:sentinel_run_status), description: "the status of the result"
    field :reason,           :string, description: "the reason for the result"
    field :job_count,        :integer, description: "the number of jobs that were run"
    field :successful_count, :integer, description: "the number of jobs that were successful"
    field :failed_count,     :integer, description: "the number of jobs that failed"
  end

  object :sentinel_statistic do
    field :status, non_null(:sentinel_run_status), description: "the status of the sentinel"
    field :count,  non_null(:integer), description: "the count of the sentinel"
  end

  object :sentinel_run_job do
    field :id,            non_null(:string), description: "the id of the job"
    field :status,        non_null(:sentinel_run_job_status), description: "the status of the job"
    field :format,        non_null(:sentinel_run_job_format), description: "the format of the job"
    field :check,         :string, description: "the check that was run"
    field :output,        :string, description: "the output of the job"

    @desc "the kubernetes job running this gate (should only be fetched lazily as this is a heavy operation)"
    field :job, :job do
      resolve fn run, _, _ -> Sentinels.run_job(run) end
      middleware ErrorHandler
    end

    field :job_spec, :job_gate_spec, description: "the job that was run", resolve: fn
      run, _, _ -> {:ok, Map.get(run, :job)}
    end

    field :reference,     :job_reference, description: "the reference to the job that was run"

    field :cluster,       :cluster, resolve: dataloader(Deployments), description: "the cluster that the job was run on"
    field :sentinel_run,  :sentinel_run, resolve: dataloader(Deployments), description: "the run that the job was run on"

    timestamps()
  end

  connection node_type: :sentinel
  connection node_type: :sentinel_run
  connection node_type: :sentinel_run_job

  object :public_sentinel_queries do
    connection field :cluster_sentinel_run_jobs, node_type: :sentinel_run_job do
      middleware ClusterAuthenticated

      resolve &Deployments.cluster_sentinel_run_jobs/2
    end

    field :sentinel_run_job, :sentinel_run_job do
      middleware ClusterAuthenticated
      arg :id, non_null(:id)

      resolve &Deployments.sentinel_run_job/2
    end
  end

  object :public_sentinel_mutations do
    field :update_sentinel_run_job, :sentinel_run_job do
      middleware ClusterAuthenticated
      arg :id, non_null(:id)
      arg :attributes, :sentinel_run_job_update_attributes

      resolve &Deployments.update_sentinel_run_job/2
    end
  end

  object :sentinel_queries do
    field :sentinel, :sentinel do
      middleware Authenticated
      arg :id,   :id
      arg :name, :string

      resolve &Deployments.sentinel/2
    end

    field :sentinel_run, :sentinel_run do
      middleware Authenticated
      arg :id, :id

      resolve &Deployments.sentinel_run/2
    end

    connection field :sentinels, node_type: :sentinel do
      middleware Authenticated
      arg :q,      :string
      arg :status, :sentinel_run_status

      resolve &Deployments.sentinels/2
    end

    field :sentinel_statistics, list_of(:sentinel_statistic) do
      middleware Authenticated
      arg :q, :string

      resolve &Deployments.sentinel_statistics/2
    end
  end

  object :sentinel_mutations do
    field :create_sentinel, :sentinel do
      middleware Authenticated
      arg :attributes, :sentinel_attributes

      resolve &Deployments.create_sentinel/2
    end

    field :update_sentinel, :sentinel do
      middleware Authenticated
      arg :id, non_null(:id)
      arg :attributes, :sentinel_attributes

      resolve &Deployments.update_sentinel/2
    end

    field :delete_sentinel, :sentinel do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.delete_sentinel/2
    end

    field :run_sentinel, :sentinel_run do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.run_sentinel/2
    end
  end
end
