defmodule Console.GraphQl.Deployments do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.{User, Deployments}

  input_object :policy_binding_attributes do
    field :id,       :id
    field :user_id,  :id
    field :group_id, :id
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

  @desc "global settings for CD, these specify global read/write policies and also allow for customization of the repos for CAPI resources and the deploy operator"
  object :deployment_settings do
    field :id,             non_null(:id)
    field :enabled,        non_null(:boolean), description: "whether you've yet to enable CD for this instance"
    field :name,           non_null(:string)

    field :artifact_repository, :git_repository, resolve: dataloader(Deployments), description: "the repo to fetch CAPI manifests from, for both providers and clusters"
    field :deployer_repository, :git_repository, resolve: dataloader(Deployments), description: "the repo to fetch the deploy operators manifests from"

    field :read_bindings,   list_of(:policy_binding), resolve: dataloader(Deployments), description: "read policy across all clusters"
    field :write_bindings,  list_of(:policy_binding), resolve: dataloader(Deployments), description: "write policy across all clusters"
    field :git_bindings,    list_of(:policy_binding), resolve: dataloader(Deployments), description: "policy for managing git repos"
    field :create_bindings, list_of(:policy_binding), resolve: dataloader(Deployments), description: "policy for creation of new clusters"

    timestamps()
  end

  input_object :deployment_settings_attributes do
    field :artifact_repository_id, :id
    field :deployer_repository_id, :id
    field :read_bindings,          list_of(:policy_binding_attributes)
    field :write_bindings,         list_of(:policy_binding_attributes)
    field :git_bindings,           list_of(:policy_binding_attributes)
    field :create_bindings,        list_of(:policy_binding_attributes)
  end

  input_object :rbac_attributes do
    field :read_bindings,  list_of(:policy_binding_attributes)
    field :write_bindings, list_of(:policy_binding_attributes)
  end

  object :deployment_queries do
    import_fields :git_queries
    import_fields :cluster_queries
    import_fields :service_queries
    import_fields :pipeline_queries
    import_fields :public_service_queries
    import_fields :public_cluster_queries

    field :deployment_settings, :deployment_settings do
      middleware Authenticated

      resolve &Deployments.settings/2
    end
  end

  object :deployment_mutations do
    import_fields :git_mutations
    import_fields :cluster_mutations
    import_fields :service_mutations
    import_fields :pipeline_mutations
    import_fields :public_cluster_mutations
    import_fields :public_service_mutations

    @desc "a reusable mutation for updating rbac settings on core services"
    field :update_rbac, :boolean do
      middleware Authenticateed
      arg :rbac,        non_null(:rbac_attributes)
      arg :service_id,  :id
      arg :cluster_id,  :id
      arg :provider_id, :id

      safe_resolve &Deployments.rbac/2
    end

    field :update_deployment_settings, :deployment_settings do
      middleware Authenticated
      arg :attributes, non_null(:deployment_settings_attributes)

      safe_resolve &Deployments.update_settings/2
    end

    field :enable_deployments, :deployment_settings do
      middleware Authenticated

      safe_resolve &Deployments.enable/2
    end
  end
end
