defmodule Console.Schema.DependencyManagementService do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Service, ScmConnection}

  schema "dependency_management_services" do
    belongs_to :service, Service
    belongs_to :connection, ScmConnection

    timestamps()
  end

  def for_connection(query \\ __MODULE__, conn_id) do
    from(dm in query, where: dm.connection_id == ^conn_id)
  end

  def ordered(query \\ __MODULE__) do
    from(dm in query,
      join: c in assoc(dm, :connection),
      order_by: [asc: c.name, desc: :inserted_at]
    )
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(service_id connection_id)a)
    |> foreign_key_constraint(:service_id)
    |> foreign_key_constraint(:connection_id)
  end
end
