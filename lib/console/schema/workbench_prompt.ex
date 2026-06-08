defmodule Console.Schema.WorkbenchPrompt do
  use Console.Schema.Base
  alias Console.Schema.Workbench
  alias Console.Schema.WorkbenchJob.Modes

  schema "workbench_prompts" do
    field :title,    :string
    field :category, :string
    field :prompt,   :binary

    embeds_one :modes, Modes, on_replace: :update
    belongs_to :workbench, Workbench

    timestamps()
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :inserted_at]) do
    from(p in query, order_by: ^order)
  end

  def for_workbench(query \\ __MODULE__, workbench_id) do
    from(p in query, where: p.workbench_id == ^workbench_id)
  end

  @valid ~w(title category prompt workbench_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:modes)
    |> foreign_key_constraint(:workbench_id)
    |> validate_required([:prompt])
  end
end
