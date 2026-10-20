defmodule Console.Schema.WorkbenchJobThought do
  use Console.Schema.Base
  alias Console.Schema.{WorkbenchJobActivity, WorkbenchTool}
  alias Console.Schema.WorkbenchJobActivity.WorkbenchJobResult.{Metric, Log, Trace}

  schema "workbench_job_thoughts" do
    field :content,    :binary
    field :tool_name,  :string
    field :tool_args,  :map

    embeds_one :tool_call, ToolCall, on_replace: :update do
      field :call_id,   :string
      field :name,      :string
      field :arguments, :map
    end

    embeds_one :attributes, Attributes, on_replace: :update do
      # legacy per-point metrics; new thoughts store `series`
      embeds_many :metrics, Metric, on_replace: :delete

      embeds_many :series, Series, on_replace: :delete, primary_key: false do
        field :name,   :string
        field :labels, :map

        embeds_many :samples, Sample, on_replace: :delete, primary_key: false do
          field :timestamp, :utc_datetime_usec
          field :value,     :float
        end
      end

      embeds_many :logs, Log, on_replace: :delete
      embeds_many :traces, Trace, on_replace: :delete
    end

    belongs_to :tool,     WorkbenchTool
    belongs_to :activity, WorkbenchJobActivity

    timestamps()
  end

  def for_activity(query \\ __MODULE__, activity_id) do
    from(t in query, where: t.activity_id == ^activity_id)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :inserted_at]) do
    from(t in query, order_by: ^order)
  end

  @valid ~w(content activity_id tool_id tool_name tool_args)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> sanitize_text([:content, :tool_name, :tool_args])
    |> cast_embed(:attributes, with: &attributes_changeset/2)
    |> cast_embed(:tool_call, with: &WorkbenchJobActivity.tool_call_changeset/2)
    |> foreign_key_constraint(:activity_id)
    |> foreign_key_constraint(:tool_id)
    |> validate_required([:activity_id])
  end

  defp attributes_changeset(model, attrs) do
    model
    |> cast(attrs, [])
    |> cast_embed(:metrics, with: &WorkbenchJobActivity.metric_changeset/2)
    |> cast_embed(:series, with: &series_changeset/2)
    |> cast_embed(:logs, with: &WorkbenchJobActivity.log_changeset/2)
    |> cast_embed(:traces, with: &WorkbenchJobActivity.trace_changeset/2)
  end

  defp series_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(name labels)a)
    |> sanitize_text([:name, :labels])
    |> cast_embed(:samples, with: &sample_changeset/2)
  end

  defp sample_changeset(model, attrs), do: cast(model, attrs, ~w(timestamp value)a)
end
