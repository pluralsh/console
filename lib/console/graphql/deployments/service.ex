defmodule Console.GraphQl.Deployments.Service do
  use Console.GraphQl.Schema.Base
  alias Console.Schema.ServiceComponent
  alias Console.GraphQl.Resolvers.{Deployments}

  ecto_enum :component_state, ServiceComponent.State

  input_object :service_deployment_attributes do
    field :name,          non_null(:string)
    field :namespace,     non_null(:string)
    field :version,       :string
    field :repository_id, non_null(:id)
    field :git,           non_null(:git_ref_attributes)
    field :configuration, list_of(:config_attributes)
    field :read_bindings, list_of(:policy_binding_attributes)
    field :write_bindings, list_of(:policy_binding_attributes)
  end

  input_object :service_update_attributes do
    field :version,       :string
    field :git,           non_null(:git_ref_attributes)
    field :configuration, list_of(:config_attributes)
  end

  input_object :git_ref_attributes do
    field :ref,    non_null(:string)
    field :folder, non_null(:string)
  end

  input_object :config_attributes do
    field :name,  non_null(:string)
    field :value, non_null(:string)
  end

  input_object :component_attributes do
    field :state,      :component_state
    field :synced,     non_null(:boolean)
    field :group,      non_null(:string)
    field :version,    non_null(:string)
    field :kind,       non_null(:string)
    field :namespace,  non_null(:string)
    field :name,       non_null(:string)
  end

  object :service_deployment do
    field :id,        non_null(:id)
    field :name,      non_null(:string)
    field :namespace, non_null(:string)
    field :version,   non_null(:string)
    field :git,       non_null(:git_ref)
    field :sha,       :string
    field :tarball,   :string, resolve: &Deployments.tarball/3

    field :deleted_at, :datetime

    field :repository, :git_repository, resolve: dataloader(Deployments)

    field :read_bindings, list_of(:policy_binding), resolve: dataloader(Deployments)
    field :write_bindings, list_of(:policy_binding), resolve: dataloader(Deployments)

    field :revision, :revision, resolve: dataloader(Deployments)
    field :configuration, list_of(:service_configuration), resolve: &Deployments.service_configuration/3
    field :components, list_of(:service_component), resolve: dataloader(Deployments)

    connection field :revisions, node_type: :revision do
      resolve &Deployments.list_revisions/3
    end

    field :editable, :boolean, resolve: &Deployments.editable/3

    timestamps()
  end

  object :revision do
    field :id,        non_null(:id)
    field :version,   non_null(:string)
    field :git,       non_null(:git_ref)
    field :sha,       :string

    timestamps()
  end

  object :git_ref do
    field :ref,    non_null(:string)
    field :folder, non_null(:string)
  end

  object :service_configuration do
    field :name,  non_null(:string)
    field :value, non_null(:string)
  end

  object :service_component do
    field :id,         non_null(:id)
    field :state,      :component_state
    field :synced,     non_null(:boolean)
    field :group,      non_null(:string)
    field :version,    non_null(:string)
    field :kind,       non_null(:string)
    field :namespace,  non_null(:string)
    field :name,       non_null(:string)
  end

  connection node_type: :service_deployment
  connection node_type: :revision

  delta :service_deployment

  object :public_service_queries do
    field :cluster_services, list_of(:service_deployment) do
      middleware ClusterAuthenticated

      resolve &Deployments.cluster_services/2
    end
  end

  object :public_service_mutations do
    field :update_service_components, :service_deployment do
      middleware ClusterAuthenticated
      arg :id, non_null(:id)
      arg :components, list_of(:component_attributes)

      safe_resolve &Deployments.update_service_components/2
    end
  end

  object :service_queries do
    connection field :service_deployments, node_type: :service_deployment do
      middleware Authenticated
      arg :cluster_id, :id

      resolve &Deployments.list_services/2
    end

    field :service_deployment, :service_deployment do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.resolve_service/2
    end
  end

  object :service_mutations do
    field :create_service_deployment, :service_deployment do
      middleware Authenticated
      arg :cluster_id, non_null(:id)
      arg :attributes, non_null(:service_deployment_attributes)

      safe_resolve &Deployments.create_service/2
    end

    field :update_service_deployment, :service_deployment do
      middleware Authenticated
      arg :id, non_null(:id)
      arg :attributes, non_null(:service_update_attributes)

      safe_resolve &Deployments.update_service/2
    end

    field :delete_service_deployment, :service_deployment do
      middleware Authenticated
      arg :id, non_null(:id)

      safe_resolve &Deployments.delete_service/2
    end

    field :rollback_service, :service_deployment do
      middleware Authenticated
      arg :id, non_null(:id)
      arg :revision_id, non_null(:id)

      safe_resolve &Deployments.rollback/2
    end
  end
end
