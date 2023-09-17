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

  object :deployment_settings do
    field :id,             non_null(:id)
    field :name,           non_null(:string)

    field :artifact_repository, :git_repository, resolve: dataloader(Deployments)
    field :deployer_repository, :git_repository, resolve: dataloader(Deployments)

    field :read_bindings,   list_of(:policy_binding), resolve: dataloader(Deployments)
    field :write_bindings,  list_of(:policy_binding), resolve: dataloader(Deployments)
    field :git_bindings,    list_of(:policy_binding), resolve: dataloader(Deployments)
    field :create_bindings, list_of(:policy_binding), resolve: dataloader(Deployments)

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

    field :deployment_settings, :deployment_settings do
      middleware Authenticated

      resolve &Deployments.settings/2
    end
  end

  object :deployment_mutations do
    import_fields :git_mutations
    import_fields :cluster_mutations
    import_fields :service_mutations

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
  end
end
