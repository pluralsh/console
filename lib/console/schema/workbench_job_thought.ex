defmodule Console.Schema.WorkbenchJobThought do
  use Console.Schema.Base
  alias Console.Schema.WorkbenchJobActivity
  alias Console.Schema.WorkbenchJobActivity.WorkbenchJobResult.{Metric, Log}

  schema "workbench_job_thoughts" do
    field :content,    :binary

    embeds_one :attributes, Attributes, on_replace: :update do
      embeds_many :metrics, Metric, on_replace: :delete
      embeds_many :logs, Log, on_replace: :delete
    end

    belongs_to :activity, WorkbenchJobActivity

    timestamps()
  end

  def for_activity(query \\ __MODULE__, activity_id) do
    from(t in query, where: t.activity_id == ^activity_id)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :inserted_at]) do
    from(t in query, order_by: ^order)
  end

  @valid ~w(content activity_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:attributes, with: &attributes_changeset/2)
    |> foreign_key_constraint(:activity_id)
    |> validate_required([:activity_id])
  end

  defp attributes_changeset(model, attrs) do
    model
    |> cast(attrs, [])
    |> cast_embed(:metrics, with: &WorkbenchJobActivity.metric_changeset/2)
    |> cast_embed(:logs, with: &WorkbenchJobActivity.log_changeset/2)
  end
end
