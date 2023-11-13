defmodule Console.Schema.ServiceError do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Service, Cluster}

  schema "service_errors" do
    field :source,  :string
    field :message, :binary

    belongs_to :cluster, Cluster
    belongs_to :service, Service

    timestamps()
  end

  @valid ~w(source message service_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:service_id)
    |> validate_required(~w(source message)a)
  end
end
