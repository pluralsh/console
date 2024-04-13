defmodule Console.Schema.RouterFilter do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Cluster, Service, Pipeline, NotificationRouter, Stack}

  schema "router_filters" do
    field :regex, :string

    belongs_to :cluster,  Cluster
    belongs_to :service,  Service
    belongs_to :pipeline, Pipeline
    belongs_to :stack,    Stack
    belongs_to :router,   NotificationRouter

    timestamps()
  end

  @valid ~w(cluster_id service_id pipeline_id router_id regex)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:cluster_id)
    |> foreign_key_constraint(:service_id)
    |> foreign_key_constraint(:pipeline_id)
    |> foreign_key_constraint(:router_id)
    |> foreign_key_constraint(:stack_id)
  end
end
