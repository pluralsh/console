defmodule Console.Schema.AgentMigration do
  use Piazza.Ecto.Schema
  alias Console.Schema.Service

  schema "agent_migrations" do
    field :name,          :string
    field :ref,           :string
    field :completed,     :boolean, default: false
    field :helm_values,   Piazza.Ecto.EncryptedString
    field :configuration, :map

    timestamps()
  end

  def updates(%__MODULE__{helm_values: vals} = mig, svc) when is_binary(vals) and byte_size(vals) > 0 do
    updates(%{mig | helm_values: nil}, svc)
    |> Map.put(:helm, %{values: vals})
  end
  def updates(%__MODULE__{ref: ref}, %Service{git: git}) when is_binary(ref),
    do: %{git: %{ref: ref, folder: git.folder}}
  def updates(_, _), do: %{}

  def expired(query \\ __MODULE__) do
    expiry = Timex.now() |> Timex.shift(days: -1)
    from(am in query, where: am.completed and am.inserted_at < ^expiry)
  end

  def incomplete(query \\ __MODULE__), do: from(am in query, where: not am.completed)

  def ordered(query \\ __MODULE__), do: from(am in query, order_by: [asc: am.inserted_at])

  @valid ~w(completed ref name helm_values)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> unique_constraint(:name)
  end
end
