defmodule Console.AI.Tools.Workbench.Monitoring.DashboardUpsert do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tools.Workbench.Monitoring

  defmodule Settings do
    use Console.AI.Tools.Workbench.Base
    alias Console.Schema.Dashboard

    embedded_schema do
      field :name, :string
      field :description, :string
      embeds_many :inputs, Dashboard.Input
    end

    def changeset(model, attrs) do
      model
      |> cast(attrs, [:name, :description])
      |> cast_embed(:inputs)
    end
  end

  embedded_schema do
    field :job, :map, virtual: true
    field :user, :map, virtual: true
    field :dashboard_name, :string
    embeds_one :graph, Console.Schema.Dashboard.Graph
    embeds_one :settings, Settings
  end

  @json_schema_path Console.priv_filename("tools/workbench/monitoring/dashboard_upsert.json")
  @external_resource @json_schema_path
  @json_schema @json_schema_path |> File.read!() |> Jason.decode!()

  def name(_), do: "workbench_dashboard_upsert"
  def json_schema(_), do: @json_schema

  def description(_),
    do:
      "Insert or replace one graph in a dashboard, creating the dashboard when its name does not exist. Optional settings update dashboard metadata and inputs. Graph layout rectangles must not overlap."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:dashboard_name])
    |> cast_embed(:graph, required: true)
    |> cast_embed(:settings)
    |> validate_required([:dashboard_name])
  end

  def implement(%__MODULE__{
        job: job,
        user: user,
        dashboard_name: name,
        graph: graph,
        settings: settings
      }),
      do: Monitoring.upsert_dashboard(job, user, name, graph, settings)
end
