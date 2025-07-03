defmodule Console.Schema.AgentSession do
  use Piazza.Ecto.Schema
  alias Console.Schema.{CloudConnection, ChatThread}

  schema "agent_sessions" do
    field :agent_id,       :string
    field :plan_confirmed, :boolean

    belongs_to :connection, CloudConnection
    belongs_to :thread,     ChatThread

    timestamps()
  end

  @valid ~w(plan_confirmed connection_id thread_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> put_new_change(:agent_id, fn -> Console.rand_alphanum(16) end)
    |> unique_constraint(:agent_id)
    |> validate_required(~w(agent_id)a)
  end
end
