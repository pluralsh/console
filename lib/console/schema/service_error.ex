defmodule Console.Schema.ServiceError do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Service, Cluster, StackRun, PipelineStage, Observer, SentinelRun}

  schema "service_errors" do
    field :source,  :string
    field :message, :binary
    field :warning, :boolean, default: false

    belongs_to :cluster,        Cluster
    belongs_to :service,        Service
    belongs_to :stack_run,      StackRun
    belongs_to :pipeline_stage, PipelineStage
    belongs_to :observer,       Observer
    belongs_to :sentinel_run,   SentinelRun

    timestamps()
  end

  @valid ~w(source message warning service_id stack_run_id pipeline_stage_id observer_id cluster_id sentinel_run_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:service_id)
    |> foreign_key_constraint(:cluster_id)
    |> foreign_key_constraint(:stack_run_id)
    |> foreign_key_constraint(:observer_id)
    |> foreign_key_constraint(:sentinel_run_id)
    |> validate_required(~w(source message)a)
  end
end
