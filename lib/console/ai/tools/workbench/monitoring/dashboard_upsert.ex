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
    embeds_many :graphs, Console.Schema.Dashboard.Graph
    embeds_one :settings, Settings
  end

  @json_schema_path Console.priv_filename("tools/workbench/monitoring/dashboard_upsert.json")
  @external_resource @json_schema_path
  @json_schema @json_schema_path |> File.read!() |> Jason.decode!()

  def name(_), do: "workbench_dashboard_upsert"
  def json_schema(_), do: @json_schema

  def description(_),
    do:
      "Atomically insert or replace one or more graphs in a dashboard by identifier, creating the dashboard when its name does not exist. If any graph or the resulting dashboard is invalid, no changes are saved. Optional settings update dashboard metadata and inputs. Section graphs and their children can be created together; sections are collapsible one-level containers joined by section_id. Graph layout rectangles must not overlap within the same section."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:dashboard_name])
    |> cast_embed(:graphs, required: true)
    |> cast_embed(:settings)
    |> validate_required([:dashboard_name])
    |> validate_length(:graphs, min: 1)
    |> validate_unique_graph_identifiers()
  end

  def implement(%__MODULE__{
        job: job,
        user: user,
        dashboard_name: name,
        graphs: graphs,
        settings: settings
      }),
      do: Monitoring.upsert_dashboard(job, user, name, graphs, settings)

  defp validate_unique_graph_identifiers(changeset) do
    identifiers =
      changeset
      |> get_field(:graphs, [])
      |> Enum.map(& &1.identifier)
      |> Enum.reject(&is_nil/1)

    if length(identifiers) == MapSet.size(MapSet.new(identifiers)) do
      changeset
    else
      add_error(changeset, :graphs, "must have unique identifiers within the batch")
    end
  end
end
