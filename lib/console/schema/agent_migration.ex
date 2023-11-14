defmodule Console.Schema.AgentMigration do
  use Piazza.Ecto.Schema

  schema "agent_migrations" do
    field :completed, :boolean, default: false

    timestamps()
  end

  def incomplete(query \\ __MODULE__), do: from(am in query, where: not am.completed)

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, [:completed])
  end
end
