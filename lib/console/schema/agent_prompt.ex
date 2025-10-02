defmodule Console.Schema.AgentPrompt do
  use Piazza.Ecto.Schema
  alias Console.Schema.AgentRun

  schema "agent_prompts" do
    field :prompt, :binary
    field :seq,    :integer

    belongs_to :agent_run, AgentRun

    timestamps()
  end

  def for_run(query \\ __MODULE__, run_id) do
    from(ap in query, where: ap.agent_run_id == ^run_id)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :seq]) do
    from(ap in query, order_by: ^order)
  end

  @valid ~w(agent_run_id prompt)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid)
  end
end
