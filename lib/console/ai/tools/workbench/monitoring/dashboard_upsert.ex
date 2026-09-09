defmodule Console.AI.Tools.Workbench.Monitoring.DashboardUpsert do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.Monitoring

  defmodule Attributes do
    use Console.AI.Tools.Workbench.Base
    alias Console.Schema.Dashboard

    embedded_schema do
      field :name, :string
      field :description, :string
      embeds_many :graphs, Dashboard.Graph
      embeds_many :inputs, Dashboard.Input
    end

    def changeset(model, attrs) do
      model
      |> cast(attrs, [:name, :description])
      |> cast_embed(:graphs)
      |> cast_embed(:inputs)
      |> validate_required([:name])
    end
  end

  embedded_schema do
    field :job, :map, virtual: true
    field :user, :map, virtual: true
    field :dashboard_id, :string
    embeds_one :attributes, Attributes
  end

  @json_schema_path Console.priv_filename("tools/workbench/monitoring/dashboard_upsert.json")
  @external_resource @json_schema_path
  @json_schema @json_schema_path |> File.read!() |> Jason.decode!()

  def name(_), do: "workbench_dashboard_upsert"
  def json_schema(_), do: @json_schema

  def description(_),
    do: "Create a dashboard in this workbench, or update one when dashboard_id is provided. Graph layout rectangles must not overlap."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:dashboard_id])
    |> cast_embed(:attributes, required: true)
  end

  def implement(%__MODULE__{job: job, user: user, dashboard_id: id, attributes: attrs}),
    do: Monitoring.upsert_dashboard(job, user, id, attrs)
end
