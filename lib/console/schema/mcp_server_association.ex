defmodule Console.Schema.McpServerAssociation do
  use Piazza.Ecto.Schema
  alias Console.Schema.{
    McpServer,
    Flow
  }

  schema "mcp_server_associations" do
    belongs_to :server, McpServer
    belongs_to :flow,   Flow

    timestamps()
  end

  @valid ~w(server_id flow_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:flow_id)
    |> foreign_key_constraint(:server_id)
    |> unique_constraint([:server_id, :flow_id])
  end
end
