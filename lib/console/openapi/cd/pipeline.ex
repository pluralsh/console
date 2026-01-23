defmodule Console.OpenAPI.CD.Pipeline do
  @moduledoc """
  OpenAPI schema for pipelines.

  A pipeline enables continuous deployment workflows by defining stages that services
  progress through, with gates for approval and promotion criteria between stages.
  """
  use Console.OpenAPI.Base

  defschema List, "A list of pipelines", %{
    type: :object,
    description: "A paginated list of pipelines",
    properties: %{
      data: array_of(Pipeline)
    }
  }

  defschema %{
    type: :object,
    title: "Pipeline",
    description: "A continuous deployment pipeline that orchestrates service promotions through stages",
    properties: timestamps(%{
      id: string(description: "Unique identifier for the pipeline"),
      name: string(description: "Name of the pipeline"),
      project_id: string(description: "ID of the project this pipeline belongs to"),
      stages: array_of(Console.OpenAPI.CD.PipelineStage, description: "Ordered list of stages in this pipeline"),
      edges: array_of(Console.OpenAPI.CD.PipelineEdge, description: "Edges connecting stages with promotion gates"),
    })
  }
end

defmodule Console.OpenAPI.CD.PipelineStage do
  @moduledoc """
  OpenAPI schema for pipeline stages.

  A stage represents a deployment environment in the pipeline (e.g., dev, staging, production).
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "PipelineStage",
    description: "A stage in the pipeline representing a deployment environment",
    properties: timestamps(%{
      id: string(description: "Unique identifier for the stage"),
      name: string(description: "Name of the stage (e.g., dev, staging, production)"),
      services: array_of(Console.OpenAPI.CD.StageService, description: "Services deployed in this stage"),
    })
  }
end

defmodule Console.OpenAPI.CD.StageService do
  @moduledoc """
  OpenAPI schema for stage services.

  A stage service represents a service deployment within a pipeline stage.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "StageService",
    description: "A service deployment within a pipeline stage",
    properties: timestamps(%{
      id: string(description: "Unique identifier for the stage service"),
      service_id: string(description: "ID of the deployed service"),
      criteria: Console.OpenAPI.CD.PromotionCriteria,
    })
  }
end

defmodule Console.OpenAPI.CD.PromotionCriteria do
  @moduledoc """
  OpenAPI schema for promotion criteria.

  Defines the criteria that must be met for a service to be promoted to the next stage.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "PromotionCriteria",
    description: "Criteria for promoting a service to the next stage",
    properties: timestamps(%{
      id: string(description: "Unique identifier for the promotion criteria"),
      pr_automation_id: string(description: "ID of the PR automation to trigger on promotion"),
      repository: string(description: "Repository to create PRs against for promotion"),
    })
  }
end

defmodule Console.OpenAPI.CD.PipelineEdge do
  @moduledoc """
  OpenAPI schema for pipeline edges.

  An edge connects two pipeline stages and defines gates that must be satisfied for promotion.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "PipelineEdge",
    description: "An edge connecting two stages with optional promotion gates",
    properties: timestamps(%{
      id: string(description: "Unique identifier for the edge"),
      from_id: string(description: "ID of the source stage"),
      to_id: string(description: "ID of the destination stage"),
      promoted_at: datetime(description: "Timestamp when promotion last occurred through this edge"),
      gates: array_of(Console.OpenAPI.CD.PipelineGate, description: "Gates that must be satisfied for promotion"),
    })
  }
end

defmodule Console.OpenAPI.CD.PipelineGate do
  @moduledoc """
  OpenAPI schema for pipeline gates.

  A gate is a checkpoint that must be satisfied before a promotion can proceed.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "PipelineGate",
    description: "A gate checkpoint for pipeline promotions",
    properties: timestamps(%{
      id: string(description: "Unique identifier for the gate"),
      name: string(description: "Name of the gate"),
      state: ecto_enum(Console.Schema.PipelineGate.State, description: "Current state of the gate (pending, open, closed, running)"),
      type: ecto_enum(Console.Schema.PipelineGate.Type, description: "Type of gate (approval, window, job)"),
    })
  }
end

defmodule Console.OpenAPI.CD.PipelineContext do
  @moduledoc """
  OpenAPI schema for pipeline contexts.

  A context provides data that flows through the pipeline for PR automations and promotions.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "PipelineContext",
    description: "A context containing data for pipeline promotions and PR automations",
    properties: timestamps(%{
      id: string(description: "Unique identifier for the context"),
      pipeline_id: string(description: "ID of the pipeline this context belongs to"),
      context: %{
        type: :object,
        description: "Arbitrary key-value data map passed through the pipeline",
        additionalProperties: true
      },
    })
  }
end

defmodule Console.OpenAPI.CD.PipelineContextInput do
  @moduledoc """
  OpenAPI schema for pipeline context creation input.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "PipelineContextInput",
    description: "Input for creating a new pipeline context to trigger a pipeline run",
    properties: %{
      context: %{
        type: :object,
        description: "Arbitrary key-value data map to pass through the pipeline for PR automations",
        additionalProperties: true
      },
    },
    required: [:context]
  }
end
