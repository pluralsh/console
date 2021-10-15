defmodule Console.Schema.RunbookExecution do
  use Piazza.Ecto.Schema
  alias Console.Schema.User

  schema "runbook_executions" do
    field :name,      :string
    field :namespace, :string
    field :context,   :map

    belongs_to :user, User

    timestamps()
  end

  def for_runbook(query \\ __MODULE__, %{metadata: %{namespace: namespace, name: name}}) do
    from(re in query, where: re.name == ^name and re.namespace == ^namespace)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(re in query, order_by: ^order)
  end

  @valid ~w(name namespace context user_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:user_id)
    |> validate_required(@valid)
  end
end
