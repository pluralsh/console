defmodule Console.Schema.McpServerAudit do
  use Piazza.Ecto.Schema
  alias Console.Schema.{
    McpServer,
    User
  }

  @expiry [months: -1]

  schema "mcp_server_audits" do
    field :tool,      :string
    field :arguments, :map

    belongs_to :server, McpServer
    belongs_to :actor,  User

    timestamps()
  end

  def expired(query \\ __MODULE__) do
    expiry = Timex.now() |> Timex.shift(@expiry)
    from(m in query, where: m.inserted_at < ^expiry)
  end

  def for_server(query \\ __MODULE__, server_id) do
    from(m in query, where: m.server_id == ^server_id)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(m in query, order_by: ^order)
  end

  @valid ~w(tool arguments server_id actor_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:server_id)
    |> foreign_key_constraint(:actor_id)
    |> unique_constraint([:server_id, :actor_id])
    |> validate_required(@valid)
  end
end
