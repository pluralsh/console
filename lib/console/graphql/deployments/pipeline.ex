defmodule Console.GraphQl.Deployments.Pipeline do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.{Deployments}

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

  object :pipeline_stage_edge do
    field :id,   non_null(:id)
    field :from, non_null(:pipeline_stage), resolve: dataloader(Deployments)
    field :to,   non_null(:pipeline_stage), resolve: dataloader(Deployments)

    timestamps()
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
      arg :name,       non_null(:string)
      arg :attributes, non_null(:pipeline_attributes)

      resolve &Deployments.upsert_pipeline/2
    end
  end
end
