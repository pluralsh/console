defmodule Console.Schema.PipelinePullRequest do
  use Piazza.Ecto.Schema
  alias Console.Schema.{PipelineContext, PipelineStage, PullRequest, Service}

  schema "pipeline_pull_requests" do
    belongs_to :context,      PipelineContext
    belongs_to :pull_request, PullRequest
    belongs_to :service,      Service
    belongs_to :stage,        PipelineStage

    timestamps()
  end

  @valid ~w(context_id pull_request_id service_id stage_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:context_id)
    |> foreign_key_constraint(:pull_request_id)
    |> validate_required(~w(context_id service_id)a)
  end
end
