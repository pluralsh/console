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

  def for_filters(query \\ __MODULE__, filters) do
    Enum.reduce(filters, query, fn
      {:regex, r}, q ->
        from(f in q, or_where: not is_nil(f.regex) and fragment("? ~ ?", ^r, f.regex))
      {:cluster_id, id}, q ->
        from(f in q, or_where: not is_nil(f.cluster_id) and f.cluster_id == ^id)
      {:service_id, id}, q ->
        from(f in q, or_where: not is_nil(f.service_id) and f.service_id == ^id)
      {:pipeline_id, id}, q ->
        from(f in q, or_where: not is_nil(f.pipeline_id) and f.pipeline_id == ^id)
      {:stack_id, id}, q ->
        from(f in q, or_where: not is_nil(f.stack_id) and f.stack_id == ^id)
    end)
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
