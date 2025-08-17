defmodule Console.GraphQl.Deployments.Sentinel do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.Deployments

  ecto_enum :sentinel_check_type, Console.Schema.Sentinel.CheckType
  ecto_enum :sentinel_run_status, Console.Schema.SentinelRun.Status

  input_object :sentinel_attributes do
    field :name,          :string, description: "the name of the sentinel"
    field :description,   :string, description: "the description of the sentinel"
    field :repository_id, :id, description: "the repository to use for this sentinel"
    field :project_id,    :id, description: "the project to use for this sentinel"
    field :git,           :git_attributes, description: "the git repository to use for this sentinel"
    field :checks,        list_of(:sentinel_check_attributes), description: "the checks to run for this sentinel"
  end

  input_object :sentinel_check_attributes do
    field :type,          non_null(:sentinel_check_type), description: "the type of check to run"
    field :name,          non_null(:string), description: "the name of the check"
    field :rule_file,     :string, description: "the rule file to use for this check"
    field :configuration, :sentinel_check_configuration_attributes, description: "the configuration to use for this check"
  end

  input_object :sentinel_check_configuration_attributes do
    field :log,        :sentinel_check_log_configuration_attributes, description: "the log configuration to use for this check"
    field :kubernetes, :sentinel_check_kubernetes_configuration_attributes, description: "the kubernetes configuration to use for this check"
  end

  input_object :sentinel_check_log_configuration_attributes do
    field :namespace,  :string, description: "the namespace to run the query against"
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

  object :sentinel do
    field :id,           non_null(:string), description: "the id of the sentinel"
    field :name,         non_null(:string), description: "the name of the sentinel"
    field :description, :string, description: "the description of the sentinel"
    field :git,         :git_ref, description: "the git location for rules files from the associated repository"
    field :repository,  :git_repository, resolve: dataloader(Deployments), description: "the git repository to use for fetching rules files for AI enabled analysis"
    field :project,     :project, resolve: dataloader(Deployments), description: "the project of this sentinel"
    field :checks,      list_of(:sentinel_check), description: "the checks to run for this sentinel"

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
  end

  object :sentinel_check_log_configuration do
    field :namespace,  :string, description: "the namespace to run the query against"
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

  object :sentinel_run do
    field :id,            non_null(:string), description: "the id of the run"
    field :status,        non_null(:sentinel_run_status), description: "the status of the run"
    field :sentinel,      :sentinel, resolve: dataloader(Deployments), description: "the sentinel that was run"
    field :results,       list_of(:sentinel_run_result), description: "the results of the run"

    timestamps()
  end

  object :sentinel_run_result do
    field :name,      :string, description: "the name of the check"
    field :status,    non_null(:sentinel_run_status), description: "the status of the result"
    field :reason,    :string, description: "the reason for the result"
  end

  connection node_type: :sentinel
  connection node_type: :sentinel_run

  object :sentinel_queries do
    field :sentinel, :sentinel do
      middleware Authenticated
      arg :id,   :id
      arg :name, :string

      resolve &Deployments.sentinel/2
    end

    connection field :sentinels, node_type: :sentinel do
      middleware Authenticated
      arg :q, :string

      resolve &Deployments.sentinels/2
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
