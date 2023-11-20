defmodule Console.GraphQl.Deployments.Pipeline do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.{Deployments, User}
  alias Console.Schema.PipelineGate

  ecto_enum :gate_state, PipelineGate.State
  ecto_enum :gate_type, PipelineGate.Type

  @desc "the top level input object for creating/deleting pipelines"
  input_object :pipeline_attributes do
    field :stages, list_of(:pipeline_stage_attributes)
    field :edges,  list_of(:pipeline_edge_attributes)
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
    field :cluster_id, :string, description: "the id of the cluster this gate will execute on"
    field :spec,       :gate_spec_attributes, description: "a specification for more complex gate types"
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
    field :labels,          :map
    field :annotations,     :map
    field :service_account, :string
  end

  @desc "the attributes for a container"
  input_object :container_attributes do
    field :image,    non_null(:string)
    field :args,     list_of(:string)
    field :env,      list_of(:env_attributes)
    field :env_from, list_of(:env_from_attributes)
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
    field :handle,    :string, description: "the handle of the cluster for the source service"
    field :name,      :string, description: "the name of the source service"
    field :source_id, :string, description: "the id of the service to promote from"
    field :secrets,   list_of(:string), description: "the secrets to copy over in a promotion"
  end

  @desc "a release pipeline, composed of multiple stages each with potentially multiple services"
  object :pipeline do
    field :id,     non_null(:id)
    field :name,   non_null(:string), description: "the name of the pipeline"
    field :stages, list_of(:pipeline_stage), description: "the stages of this pipeline", resolve: dataloader(Deployments)
    field :edges,  list_of(:pipeline_stage_edge),
      description: "edges linking two stages w/in the pipeline in a full DAG",
      resolve: dataloader(Deployments)

    timestamps()
  end

  @desc "a pipeline stage, has a list of services and potentially a promotion which might be pending"
  object :pipeline_stage do
    field :id,        non_null(:id)
    field :name,      non_null(:string), description: "the name of this stage (eg dev, prod, staging)"
    field :services,  list_of(:stage_service), description: "the services within this stage", resolve: dataloader(Deployments)
    field :promotion, :pipeline_promotion,
      description: "a promotion which might be outstanding for this stage",
      resolve: dataloader(Deployments)

    timestamps()
  end

  @desc "an edge in the pipeline DAG"
  object :pipeline_stage_edge do
    field :id,          non_null(:id)
    field :promoted_at, :datetime, description: "when the edge was last promoted, if greater than the promotion objects revised at, was successfully promoted"
    field :from,        non_null(:pipeline_stage), resolve: dataloader(Deployments)
    field :to,          non_null(:pipeline_stage), resolve: dataloader(Deployments)
    field :gates,       list_of(:pipeline_gate), resolve: dataloader(Deployments)

    timestamps()
  end

  @desc "A gate blocking promotion along a release pipeline"
  object :pipeline_gate do
    field :id,    non_null(:id)
    field :name,  non_null(:string), description: "the name of this gate as seen in the UI"
    field :type,  non_null(:gate_type), description: "the type of gate this is"
    field :state, non_null(:gate_state), description: "the current state of this gate"
    field :spec,  :gate_spec, description: "more detailed specification for complex gates"

    field :approver, :user, description: "the last user to approve this gate", resolve: dataloader(User)

    timestamps()
  end

  @desc "detailed gate specifications"
  object :gate_spec do
    field :job, :job_gate_spec
  end

  @desc "the full specification of a job gate"
  object :job_gate_spec do
    field :namespace,       non_null(:string), description: "the namespace the job will run in"
    field :raw,             :string, description: "a raw kubernetes job resource, overrides any other configuration"
    field :containers,      list_of(:container_spec), description: "list of containers to run in this job"
    field :labels,          :map, description: "any pod labels to apply"
    field :annotations,     :map, description: "any pod annotations to apply"
    field :service_account, :string, description: "the service account the pod will use"
  end

  @desc "a shortform spec for job containers, designed for ease-of-use"
  object :container_spec do
    field :image,    non_null(:string)
    field :args,     list_of(:string)
    field :env,      list_of(:container_env)
    field :env_from, list_of(:container_env_from)
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
    field :id,      non_null(:id)
    field :source,  :service_deployment,
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

  connection node_type: :pipeline

  object :public_pipeline_queries do
    field :cluster_gates, list_of(:pipeline_gate) do
      middleware ClusterAuthenticated

      resolve &Deployments.cluster_gates/2
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

      resolve &Deployments.list_pipelines/2
    end

    field :pipeline, :pipeline do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.resolve_pipeline/2
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

    @desc "approves an approval pipeline gate"
    field :approve_gate, :pipeline_gate do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.approve_gate/2
    end

    @desc "forces a pipeline gate to be in open state"
    field :force_gate, :pipeline_gate do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.force_gate/2
    end
  end
end
