defmodule Console.Schema.Dashboard do
  use Console.Schema.Base
  alias Console.Schema.Workbench

  defmodule Datasource do
    use Console.Schema.Base

    defenum Type, logs: 0, metrics: 1, traces: 2, labels: 3

    embedded_schema do
      field :type,  Type
      field :tool,  :string
      field :input, :map
    end

    def changeset(model, attrs) do
      model
      |> cast(attrs, [:type, :tool, :input])
      |> validate_required([:type, :tool, :input])
    end
  end

  defmodule Graph do
    use Console.Schema.Base
    alias Console.Schema.Dashboard.Datasource

    defenum Type,
      timeseries: 0,
      gauge: 1,
      logs: 2,
      markdown: 3,
      table: 4,
      stat: 5,
      bar: 6,
      pie: 7,
      heatmap: 8,
      traces: 9

    defmodule Layout do
      use Console.Schema.Base

      embedded_schema do
        field :x, :integer
        field :y, :integer
        field :w, :integer
        field :h, :integer
      end

      def changeset(model, attrs) do
        model
        |> cast(attrs, [:x, :y, :w, :h])
        |> validate_required([:x, :y, :w, :h])
        |> validate_number(:x, greater_than_or_equal_to: 0)
        |> validate_number(:y, greater_than_or_equal_to: 0)
        |> validate_number(:w, greater_than: 0)
        |> validate_number(:h, greater_than: 0)
      end
    end

    embedded_schema do
      field :identifier,  :string
      field :title,       :string
      field :description, :string
      field :type,        Type
      field :markdown,    :string
      field :options,     :map

      embeds_one :layout,     Layout, on_replace: :update
      embeds_one :datasource, Datasource, on_replace: :update
    end

    def changeset(model, attrs) do
      model
      |> cast(attrs, [:identifier, :title, :description, :type, :markdown, :options])
      |> cast_embed(:layout, required: true)
      |> cast_embed(:datasource)
      |> validate_required([:identifier, :type])
      |> validate_markdown()
    end

    defp validate_markdown(changeset) do
      case get_field(changeset, :type) do
        :markdown -> validate_required(changeset, [:markdown])
        _ -> changeset
      end
    end
  end

  defmodule Input do
    use Console.Schema.Base
    alias Console.Schema.Dashboard.Datasource

    defenum Type,
      text: 0,
      number: 1,
      boolean: 2,
      select: 3,
      multi_select: 4,
      time_range: 5

    embedded_schema do
      field :name,        :string
      field :label,       :string
      field :description, :string
      field :type,        Type
      field :default,     :string
      field :options,     {:array, :string}
      field :required,    :boolean, default: false

      embeds_one :datasource, Datasource, on_replace: :update
    end

    def changeset(model, attrs) do
      model
      |> cast(attrs, [:name, :label, :description, :type, :default, :options, :required])
      |> cast_embed(:datasource)
      |> validate_required([:name, :type])
    end
  end

  schema "dashboards" do
    field :name,        :string
    field :description, :string

    embeds_many :graphs, Graph, on_replace: :delete
    embeds_many :inputs, Input, on_replace: :delete

    belongs_to :workbench, Workbench

    timestamps()
  end

  def for_workbench(query \\ __MODULE__, workbench_id) do
    from(d in query, where: d.workbench_id == ^workbench_id)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(d in query, order_by: ^order)
  end

  @valid ~w(name description workbench_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:graphs)
    |> cast_embed(:inputs)
    |> foreign_key_constraint(:workbench_id)
    |> unique_constraint([:workbench_id, :name])
    |> validate_required([:name, :workbench_id])
    |> validate_unique_graph_identifiers()
    |> validate_graph_intersections()
  end

  defp validate_unique_graph_identifiers(changeset) do
    identifiers =
      changeset
      |> get_field(:graphs, [])
      |> Enum.map(& &1.identifier)
      |> Enum.reject(&is_nil/1)

    if length(identifiers) == MapSet.size(MapSet.new(identifiers)) do
      changeset
    else
      add_error(changeset, :graphs, "must have unique identifiers")
    end
  end

  defp validate_graph_intersections(changeset) do
    graphs = get_field(changeset, :graphs, [])

    graphs
    |> find_intersections()
    |> Enum.reduce(changeset, fn {left, right}, changeset ->
        add_error(
          changeset,
          :graphs,
          "graphs #{left.identifier} and #{right.identifier} have intersecting layout rectangles"
        )
    end)
  end

  defp find_intersections(graphs) do
    for {left, index} <- Enum.with_index(graphs),
        right <- Enum.drop(graphs, index + 1),
        rectangles_intersect?(left.layout, right.layout),
        do: {left, right}
  end

  defp rectangles_intersect?(
         %{x: ax, y: ay, w: aw, h: ah},
         %{x: bx, y: by, w: bw, h: bh}
       )
       when is_integer(ax) and is_integer(ay) and is_integer(aw) and is_integer(ah) and
              is_integer(bx) and is_integer(by) and is_integer(bw) and is_integer(bh) do
    ax < bx + bw and ax + aw > bx and ay < by + bh and ay + ah > by
  end

  defp rectangles_intersect?(_, _), do: false
end
