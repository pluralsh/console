defmodule Console.GraphQl.Deployments.Pipeline do
  use Console.GraphQl.Schema.Base
  alias Console.Deployments.Pipelines
  alias Console.GraphQl.Resolvers.{Deployments, User}
  alias Console.Schema.PipelineGate

  ecto_enum :gate_state, PipelineGate.State
  ecto_enum :gate_type, PipelineGate.Type

  @desc "the top level input object for creating/deleting pipelines"
  input_object :pipeline_attributes do
    field :project_id,       :id
    field :flow_id,          :id
    field :stages,           list_of(:pipeline_stage_attributes)
    field :edges,            list_of(:pipeline_edge_attributes)
    field :read_bindings,    list_of(:policy_binding_attributes)
    field :write_bindings,   list_of(:policy_binding_attributes)
  end

  @desc "specification of a stage of a pipeline"
  input_object :pipeline_stage_attributes do
    field :name,     non_null(:string)
    field :services, list_of(:stage_service_attributes)
  end

  @desc "specification of an edge between two pipeline stages"
  input_object :pipeline_edge_attributes do
    field :from_id, :id, description: "stage id the edge is from, can also be specified by name"
    field :to_id,   :id, description: "stage id the edge is to, can also be specified by name"
    field :from,    :string, description: "the name of the pipeline stage this edge emits from"
    field :to,      :string, description: "the name of the pipeline stage this edge points to"
    field :gates, list_of(:pipeline_gate_attributes), description: "any optional promotion gates you wish to configure"
  end

  @desc "will configure a promotion gate for a pipeline"
  input_object :pipeline_gate_attributes do
    field :name,       non_null(:string), description: "the name of this gate"
    field :type,       non_null(:gate_type), description: "the type of gate this is"
    field :cluster,    :string, description: "the handle of a cluster this gate will execute on"
    field :cluster_id, :id, description: "the id of the cluster this gate will execute on"
    field :spec,       :gate_spec_attributes, description: "a specification for more complex gate types"
  end

  @desc "attributes needed to create a new pipeline context"
  input_object :pipeline_context_attributes do
    field :context, non_null(:json)
  end

  @desc "the allowed inputs for a deployment agent gate update"
  input_object :gate_update_attributes do
    field :state,  :gate_state
    field :status, :gate_status_attributes
  end

  input_object :gate_status_attributes do
    field :job_ref, :namespaced_name
  end

  input_object :namespaced_name do
    field :name,      non_null(:string)
    field :namespace, non_null(:string)
  end

  @desc "a more refined spec for parameters needed for complex gates"
  input_object :gate_spec_attributes do
    field :job, :gate_job_attributes
  end

  @desc "spec for a job gate"
  input_object :gate_job_attributes do
    field :namespace,       non_null(:string)
    field :raw,             :string, description: "if you'd rather define the job spec via straight k8s yaml"
    field :containers,      list_of(:container_attributes)
    field :labels,          :json
    field :annotations,     :json
    field :service_account, :string
    field :resources,       :container_resources_attributes, description: "request overrides if you don't want to manually configure individual containers"
  end

  @desc "the attributes for a container"
  input_object :container_attributes do
    field :name,      :string
    field :image,     non_null(:string)
    field :args,      list_of(:string)
    field :env,       list_of(:env_attributes)
    field :env_from,  list_of(:env_from_attributes)
    field :resources, :container_resources_attributes
  end

  input_object :container_resources_attributes do
    field :requests, :resource_request_attributes
    field :limits,   :resource_request_attributes
  end

  input_object :resource_request_attributes do
    field :cpu,    :string
    field :memory, :string
  end

  input_object :env_attributes do
    field :name,  non_null(:string)
    field :value, non_null(:string)
  end

  input_object :env_from_attributes do
    field :secret,     non_null(:string)
    field :config_map, non_null(:string)
  end

  @desc "the attributes of a service w/in a specific stage"
  input_object :stage_service_attributes do
    field :handle,     :string, description: "the cluster handle of this service"
    field :name,       :string, description: "the name of this service"
    field :service_id, :id, description: "the name of this service"
    field :criteria,   :promotion_criteria_attributes
  end

  @desc "actions to perform if this stage service were promoted"
  input_object :promotion_criteria_attributes do
    field :handle,           :string, description: "the handle of the cluster for the source service"
    field :name,             :string, description: "the name of the source service"
    field :source_id,        :id, description: "the id of the service to promote from"
    field :pr_automation_id, :id, description: "the id of a pr automation to update this service"
    field :repository,       :string, description: "overrides the repository slug for the referenced pr automation"
    field :secrets,          list_of(:string), description: "the secrets to copy over in a promotion"
  end

  @desc "a release pipeline, composed of multiple stages each with potentially multiple services"
  object :pipeline do
    field :id,     non_null(:id)
    field :name,   non_null(:string), description: "the name of the pipeline"
    field :stages, list_of(:pipeline_stage), description: "the stages of this pipeline", resolve: dataloader(Deployments)

    field :status, :pipeline_status, resolve: fn
      %{id: id}, _, %{context: %{loader: loader}} ->
        manual_dataloader(loader, Console.GraphQl.Resolvers.PipelineGateLoader, :pipeline, id)
    end

    field :project, :project, resolve: dataloader(Deployments), description: "the project this pipeline belongs to"
    field :flow,    :flow, resolve: dataloader(Deployments), description: "the flow this pipeline belongs to"

    field :read_bindings, list_of(:policy_binding), resolve: dataloader(Deployments), description: "read policy for this pipeline"
    field :write_bindings, list_of(:policy_binding), resolve: dataloader(Deployments), description: "write policy of this pipeline"

    field :edges,  list_of(:pipeline_stage_edge),
      description: "edges linking two stages w/in the pipeline in a full DAG",
      resolve: dataloader(Deployments)

    @desc "lists the contexts applied to a pipeline"
    connection field :contexts, node_type: :pipeline_context do
      resolve &Deployments.pipeline_contexts/3
    end

    timestamps()
  end

  @desc "A variable context that can be used to generate pull requests as a pipeline progresses"
  object :pipeline_context do
    field :id,            non_null(:id)
    field :context,       non_null(:map), description: "the context map that will be passed to the pipeline"
    field :pipeline,      :pipeline, resolve: dataloader(Deployments)
    field :pull_requests, list_of(:pull_request), resolve: dataloader(Deployments),
      description: "a history of pull requests created by this context thus far"
    field :pipeline_pull_requests, list_of(:pipeline_pull_request), resolve: dataloader(Deployments),
      description: "a list of pipeline-specific PRs for this context"

    timestamps()
  end

  @desc "a pipeline stage, has a list of services and potentially a promotion which might be pending"
  object :pipeline_stage do
    field :id,        non_null(:id)
    field :name,      non_null(:string), description: "the name of this stage (eg dev, prod, staging)"

    field :errors, list_of(:service_error),
      description: "the errors for this stage",
      resolve: dataloader(Deployments)

    field :services,  list_of(:stage_service), description: "the services within this stage", resolve: dataloader(Deployments)
    field :context,   :pipeline_context,
      description: "the context that is to be applied to this stage for PR promotions",
      resolve: dataloader(Deployments)
    field :promotion, :pipeline_promotion,
      description: "a promotion which might be outstanding for this stage",
      resolve: dataloader(Deployments)

    connection field :context_history, node_type: :pipeline_context_history do
      resolve &Deployments.pipeline_context_history/3
    end

    timestamps()
  end

  @desc "an edge in the pipeline DAG"
  object :pipeline_stage_edge do
    field :id,          non_null(:id)
    field :promoted_at, :datetime, description: "when the edge was last promoted, if greater than the promotion objects revised at, was successfully promoted"
    field :from,        non_null(:pipeline_stage), resolve: dataloader(Deployments)
    field :to,          non_null(:pipeline_stage), resolve: dataloader(Deployments)
    field :gates,       list_of(:pipeline_gate), resolve: dataloader(Deployments)

    field :pipeline,    :pipeline, resolve: dataloader(Deployments)

    timestamps()
  end

  @desc "A gate blocking promotion along a release pipeline"
  object :pipeline_gate do
    field :id,     non_null(:id)
    field :name,   non_null(:string), description: "the name of this gate as seen in the UI"
    field :type,   non_null(:gate_type), description: "the type of gate this is"
    field :state,  non_null(:gate_state), description: "the current state of this gate"
    field :spec,   :gate_spec, description: "more detailed specification for complex gates"
    field :status, :gate_status, description: "state related to the current status of this job"

    @desc "the kubernetes job running this gate (should only be fetched lazily as this is a heavy operation)"
    field :job, :job do
      resolve fn gate, _, _ -> Pipelines.gate_job(gate) end
      middleware ErrorHandler
    end

    field :edge,     :pipeline_stage_edge, description: "the edge this gate lives on", resolve: dataloader(Deployments)
    field :cluster,  :cluster, description: "the cluster this gate can run on", resolve: dataloader(Deployments)
    field :approver, :user, description: "the last user to approve this gate", resolve: dataloader(User)

    timestamps()
  end

  @desc "detailed gate specifications"
  object :gate_spec do
    field :job, :job_gate_spec
  end

  @desc "state delineating the current status of this gate"
  object :gate_status do
    field :job_ref, :job_reference
  end

  @desc "the full specification of a job gate"
  object :job_gate_spec do
    field :namespace,       non_null(:string), description: "the namespace the job will run in"
    field :raw,             :string, description: "a raw kubernetes job resource, overrides any other configuration"
    field :containers,      list_of(:container_spec), description: "list of containers to run in this job"
    field :labels,          :map, description: "any pod labels to apply"
    field :annotations,     :map, description: "any pod annotations to apply"
    field :service_account, :string, description: "the service account the pod will use"

    @desc "equivalent to resources, present for backwards compatibility"
    field :requests,        :container_resources , resolve: fn %{resources: res}, _, _ -> {:ok, res} end

    @desc "requests overrides for cases where direct container configuration is unnecessary"
    field :resources,       :container_resources
  end

  @desc "a shortform spec for job containers, designed for ease-of-use"
  object :container_spec do
    field :image,     non_null(:string)
    field :args,      list_of(:string)
    field :env,       list_of(:container_env)
    field :env_from,  list_of(:container_env_from)
    field :resources, :container_resources
  end

  @desc "container env variable"
  object :container_env do
    field :name,  non_null(:string)
    field :value, non_null(:string)
  end

  @desc "env from declarations for containers"
  object :container_env_from do
    field :config_map, non_null(:string)
    field :secret,     non_null(:string)
  end

  @desc "A combined kubernetes pod container resource requests spec"
  object :container_resources do
    field :requests, :resource_request
    field :limits,   :resource_request
  end

  @desc "A kubernetes pod container resource request spec"
  object :resource_request do
    field :cpu,    :string
    field :memory, :string
  end

  @desc "the configuration of a service within a pipeline stage, including optional promotion criteria"
  object :stage_service do
    field :id,       non_null(:id)
    field :service,  :service_deployment, description: "a pointer to a service", resolve: dataloader(Deployments)
    field :criteria, :promotion_criteria,
      description: "criteria for how a promotion of this service shall be performed",
      resolve: dataloader(Deployments)

    timestamps()
  end

  @desc "how a promotion for a service will be performed"
  object :promotion_criteria do
    field :id,         non_null(:id)
    field :repository, :string, description: "overrides the repository slug for the referenced pr automation"
    field :source,     :service_deployment,
      description: "the source service in a prior stage to promote settings from",
      resolve: dataloader(Deployments)
    field :secrets, list_of(:string),
      description: "whether you want to copy any configuration values from the source service"

    timestamps()
  end

  @desc "a representation of an individual pipeline promotion, which is a list of services/revisions and timestamps to determine promotion status"
  object :pipeline_promotion do
    field :id,          non_null(:id)
    field :revised_at,  :datetime, description: "the last time this promotion was updated"
    field :promoted_at, :datetime, description: "the last time this promotion was fully promoted, it's no longer pending if promoted_at > revised_at"
    field :services,    list_of(:promotion_service),
      description: "the services included in this promotion",
      resolve: dataloader(Deployments)

    timestamps()
  end

  @desc "a service to be potentially promoted"
  object :promotion_service do
    field :id,       non_null(:id)
    field :service,  :service_deployment, description: "a service to promote", resolve: dataloader(Deployments)
    field :revision, :revision, description: "the revision of the service to promote", resolve: dataloader(Deployments)

    timestamps()
  end

  @desc "a report of gate statuses within a pipeline to gauge its health"
  object :pipeline_status do
    field :pending, :integer, description: "if > 0, consider the pipeline pending"
    field :closed,  :integer, description: "if > 0, consider the pipeline stopped"
    field :running, :integer, description: "if > 0, consider the pipeline runnning"
  end

  @desc "A pull request created in the course of executing a pipeline"
  object :pipeline_pull_request do
    field :id,           non_null(:id)
    field :service,      :service_deployment, resolve: dataloader(Deployments)
    field :pull_request, :pull_request,       resolve: dataloader(Deployments)
    field :stage,        :pipeline_stage,     resolve: dataloader(Deployments)
  end

  @desc "A record of a prior pipeline context attached to a stage"
  object :pipeline_context_history do
    field :id,      non_null(:id)
    field :stage,   :pipeline_stage, resolve: dataloader(Deployments)
    field :context, :pipeline_context, resolve: dataloader(Deployments)

    timestamps()
  end

  connection node_type: :pipeline
  connection node_type: :pipeline_gate
  connection node_type: :pipeline_context
  connection node_type: :pipeline_context_history

  delta :pipeline

  object :public_pipeline_queries do
    field :cluster_gates, list_of(:pipeline_gate) do
      middleware ClusterAuthenticated

      resolve &Deployments.cluster_gates/2
    end

    connection field :paged_cluster_gates, node_type: :pipeline_gate do
      middleware ClusterAuthenticated

      resolve &Deployments.paged_cluster_gates/2
    end

    field :cluster_gate, :pipeline_gate do
      middleware ClusterAuthenticated
      arg :id, non_null(:id)

      resolve &Deployments.cluster_gate/2
    end
  end

  object :public_pipeline_mutations do
    field :update_gate, :pipeline_gate do
      middleware ClusterAuthenticated
      arg :id,         non_null(:id)
      arg :attributes, non_null(:gate_update_attributes)

      resolve &Deployments.update_gate/2
    end
  end

  object :pipeline_queries do
    connection field :pipelines, node_type: :pipeline do
      middleware Authenticated
      arg :q,          :string
      arg :project_id, :id

      resolve &Deployments.list_pipelines/2
    end

    field :pipeline, :pipeline do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.resolve_pipeline/2
    end

    field :pipeline_gate, :pipeline_gate do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.resolve_gate/2
    end

    field :pipeline_context, :pipeline_context do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.resolve_pipeline_context/2
    end
  end

  object :pipeline_mutations do
    @desc "upserts a pipeline with a given name"
    field :save_pipeline, :pipeline do
      middleware Authenticated
      arg :name,       non_null(:string)
      arg :attributes, non_null(:pipeline_attributes)

      resolve &Deployments.upsert_pipeline/2
    end

    @desc "creates a new pipeline context and binds it to the beginning stage"
    field :create_pipeline_context, :pipeline_context do
      middleware Authenticated
      middleware Scope, api: "createPipelineContext"
      arg :pipeline_id,   :id
      arg :pipeline_name, :string
      arg :attributes,    non_null(:pipeline_context_attributes)

      resolve &Deployments.create_pipeline_context/2
    end

    field :delete_pipeline, :pipeline do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.delete_pipeline/2
    end

    @desc "approves an approval pipeline gate"
    field :approve_gate, :pipeline_gate do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.approve_gate/2
    end

    @desc "forces a pipeline gate to be in open state"
    field :force_gate, :pipeline_gate do
      middleware Authenticated
      arg :id,    non_null(:id)
      arg :state, :gate_state

      resolve &Deployments.force_gate/2
    end
  end

  object :pipeline_subscriptions do
    field :pipeline_delta, :pipeline_delta do
      arg :id, non_null(:id)

      config fn args, ctx ->
        with {:ok, pipe} <- Deployments.resolve_pipeline(args, ctx),
          do: {:ok, topic: "pipelines:#{pipe.id}"}
      end
    end
  end
end
