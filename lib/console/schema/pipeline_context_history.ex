defmodule Console.Schema.PipelineContextHistory do
  use Piazza.Ecto.Schema
  alias Console.Schema.{PipelineStage, PipelineContext}

  schema "pipeline_context_history" do
    belongs_to :stage, PipelineStage
    belongs_to :context, PipelineContext

    timestamps()
  end

  def for_stage(query \\ __MODULE__, stage_id) do
    from(pch in query, where: pch.stage_id == ^stage_id)
  end

  def for_context(query \\ __MODULE__, context_id) do
    from(pch in query, where: pch.context_id == ^context_id)
  end

  def last_context(query \\ __MODULE__, stage_id, context_id) do
    ctx = from(pch in __MODULE__,
      where: pch.stage_id == ^stage_id and pch.context_id == ^context_id,
      group_by: pch.stage_id,
      select: %{id: pch.stage_id, max: max(pch.inserted_at)}
    )

    from(pch in query,
      join: lasts in subquery(ctx),
        on: pch.stage_id == lasts.id,
      where: pch.inserted_at < lasts.max and pch.context_id != ^context_id,
      limit: 1,
      order_by: [desc: :inserted_at]
    )
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(pch in query, order_by: ^order)
  end

  @valid ~w(context_id stage_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:context_id)
    |> foreign_key_constraint(:stage_id)
    |> validate_required(@valid)
  end
end
