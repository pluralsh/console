 defmodule Console.GraphQl.Deployments do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.{User, Deployments}

  input_object :policy_binding_attributes do
    field :id,       :id
    field :user_id,  :id
    field :group_id, :id
  end

  input_object :loki_query do
    field :labels, list_of(:loki_label_filter)
    field :filter, :loki_line_filter
  end

  input_object :loki_label_filter do
    field :name,  non_null(:string)
    field :value, non_null(:string)
    field :regex, :boolean, description: "whether to apply a regex match for this label"
  end

  input_object :loki_line_filter do
    field :text,  :string, description: "the string to filter for (eg what is put in our search ui)"
    field :regex, :boolean, description: "whether to treat this string as a regex match"
  end

  object :policy_binding do
    field :id,    :id
    field :user,  :user, resolve: dataloader(User)
    field :group, :group, resolve: dataloader(User)
  end

  import_types Console.GraphQl.Deployments.Git
  import_types Console.GraphQl.Deployments.Cluster
  import_types Console.GraphQl.Deployments.Service
  import_types Console.GraphQl.Deployments.Pipeline
  import_types Console.GraphQl.Deployments.Backup
  import_types Console.GraphQl.Deployments.Notification
  import_types Console.GraphQl.Deployments.Policy
  import_types Console.GraphQl.Deployments.Global
  import_types Console.GraphQl.Deployments.Stack
  import_types Console.GraphQl.Deployments.Observability
  import_types Console.GraphQl.Deployments.Settings
  import_types Console.GraphQl.Deployments.OAuth
  import_types Console.GraphQl.Deployments.Flow
  import_types Console.GraphQl.Deployments.Sentinel
  import_types Console.GraphQl.Deployments.Agent

  input_object :rbac_attributes do
    field :read_bindings,  list_of(:policy_binding_attributes)
    field :write_bindings, list_of(:policy_binding_attributes)
  end

  object :deployment_queries do
    import_fields :git_queries
    import_fields :cluster_queries
    import_fields :service_queries
    import_fields :pipeline_queries
    import_fields :backup_queries
    import_fields :public_service_queries
    import_fields :public_cluster_queries
    import_fields :public_pipeline_queries
    import_fields :public_backup_queries
    import_fields :notification_queries
    import_fields :policy_queries
    import_fields :global_queries
    import_fields :public_global_queries
    import_fields :public_stack_queries
    import_fields :stack_queries
    import_fields :observability_provider_queries
    import_fields :settings_queries
    import_fields :flow_queries
    import_fields :oauth_queries
    import_fields :sentinel_queries
    import_fields :agent_queries
    import_fields :public_agent_queries
  end

  object :deployment_mutations do
    import_fields :git_mutations
    import_fields :cluster_mutations
    import_fields :service_mutations
    import_fields :pipeline_mutations
    import_fields :backup_mutations
    import_fields :public_cluster_mutations
    import_fields :public_service_mutations
    import_fields :public_pipeline_mutations
    import_fields :public_backup_mutations
    import_fields :notification_mutations
    import_fields :public_policy_mutations
    import_fields :global_mutations
    import_fields :public_stack_mutations
    import_fields :stack_mutations
    import_fields :observability_provider_mutations
    import_fields :settings_mutations
    import_fields :oauth_mutations
    import_fields :flow_mutations
    import_fields :sentinel_mutations
    import_fields :agent_mutations
    import_fields :public_agent_mutations

    @desc "a reusable mutation for updating rbac settings on core services"
    field :update_rbac, :boolean do
      middleware Authenticated
      arg :rbac,        non_null(:rbac_attributes)
      arg :service_id,  :id
      arg :cluster_id,  :id
      arg :provider_id, :id
      arg :pipeline_id, :id
      arg :stack_id,    :id
      arg :project_id,  :id
      arg :catalog_id,  :id
      arg :flow_id,     :id
      arg :server_id,   :id

      safe_resolve &Deployments.rbac/2
    end
  end

  object :deployment_subscriptions do
    import_fields :stack_subscriptions
    import_fields :pipeline_subscriptions
    import_fields :service_subscriptions
  end
end
