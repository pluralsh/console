defmodule Console.Schema.WorkbenchJobResult do
  use Console.Schema.Base
  alias Console.Schema.{WorkbenchJob, WorkbenchJobActivity}
  alias Console.Schema.WorkbenchJobActivity.WorkbenchJobResult.{Metric, Log}

  defenum TodoStatus, pending: 0, in_progress: 1, completed: 2

  defmodule ToolQuery do
    use Console.Schema.Base

    embedded_schema do
      field :tool_name, :string
      field :tool_args, Console.Schema.MapJson
      field :summary,   :string
    end

    def changeset(model, attrs) do
      model
      |> cast(attrs, [:tool_name, :tool_args, :summary])
      |> validate_required([:tool_name])
    end
  end

  defmodule Metadata do
    use Console.Schema.Base
    alias Console.Schema.WorkbenchJobResult.ToolQuery

    embedded_schema do
      embeds_many :metrics, Metric, on_replace: :delete
      embeds_many :logs,    Log, on_replace: :delete

      embeds_one :metrics_query, ToolQuery, on_replace: :update
      embeds_one :logs_query,    ToolQuery, on_replace: :update
    end

    def changeset(model, attrs \\ %{}) do
      model
      |> cast(attrs, [])
      |> cast_embed(:logs, with: &WorkbenchJobActivity.log_changeset/2)
      |> cast_embed(:metrics_query)
    end
  end

  defmodule ToolGraph do
    use Console.Schema.Base
    alias Console.Schema.WorkbenchJobResult.ToolQuery

    embedded_schema do
      field :title,       :string
      field :summary,     :string

      embeds_one :query,  ToolQuery, on_replace: :update
    end

    def changeset(model, attrs) do
      model
      |> cast(attrs, [:title, :summary])
      |> cast_embed(:query, required: true)
      |> validate_required([:title])
    end
  end

  defmodule DataPoint do
    use Console.Schema.Base

    embedded_schema do
      field :label, :string
      field :value, :float
    end

    def changeset(model, attrs) do
      model
      |> cast(attrs, [:label, :value])
      |> validate_required([:label, :value])
    end
  end

  defmodule CanvasBlock do
    use Console.Schema.Base
    alias Console.Schema.WorkbenchJobResult.{ToolGraph, DataPoint}

    defenum Type, markdown: 0, metrics: 1, logs: 2, pie: 3, bar: 4

    defmodule Layout do
      use Console.Schema.Base

      embedded_schema do
        field :x,     :integer
        field :y,     :integer
        field :w,     :integer
        field :h,     :integer
      end

      def changeset(model, attrs) do
        model
        |> cast(attrs, [:x, :y, :w, :h])
        |> validate_required([:x, :y, :w, :h])
      end
    end

    defmodule Graph do
      use Console.Schema.Base
      alias Console.Schema.WorkbenchJobResult.DataPoint

      embedded_schema do
        field :title, :string
        embeds_many :data, DataPoint, on_replace: :delete
      end

      def changeset(model, attrs) do
        model
        |> cast(attrs, [:title])
        |> cast_embed(:data)
        |> validate_required([:title])
      end
    end

    embedded_schema do
      field :identifier, :string
      field :type,       Type

      embeds_one :layout, Layout, on_replace: :update

      embeds_one :content, Content, on_replace: :update do
        field :markdown, :string

        embeds_one :metrics, ToolGraph, on_replace: :update
        embeds_one :logs,    ToolGraph, on_replace: :update

        embeds_one :pie, Graph, on_replace: :update
        embeds_one :bar, Graph, on_replace: :update
      end
    end

    def changeset(model, attrs) do
      model
      |> cast(attrs, [:type, :identifier])
      |> cast_embed(:content, with: &content_changeset/2)
      |> cast_embed(:layout)
      |> validate_required([:type, :identifier])
    end

    defp content_changeset(model, attrs) do
      model
      |> cast(attrs, [:markdown])
      |> cast_embed(:metrics)
      |> cast_embed(:logs)
      |> cast_embed(:pie)
      |> cast_embed(:bar)
    end
  end

  schema "workbench_job_results" do
    field :working_theory, :binary
    field :conclusion,     :binary
    field :topology,       :binary

    embeds_many :todos, Todo, on_replace: :delete do
      field :name,        :string
      field :description, :string
      field :done,        :boolean, default: false
    end

    embeds_many :canvas, CanvasBlock, on_replace: :delete

    embeds_one  :metadata, Metadata, on_replace: :update

    belongs_to :workbench_job, WorkbenchJob

    timestamps()
  end

  def for_workbench_job(query \\ __MODULE__, job_id) do
    from(r in query, where: r.workbench_job_id == ^job_id)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(r in query, order_by: ^order)
  end

  @valid ~w(working_theory conclusion topology workbench_job_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:todos, with: &todo_changeset/2)
    |> cast_embed(:metadata)
    |> cast_embed(:canvas)
    |> foreign_key_constraint(:workbench_job_id)
    |> unique_constraint(:workbench_job_id)
  end

  def todo_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(name description done)a)
    |> validate_required(~w(name description)a)
  end
end
