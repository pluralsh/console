defmodule Console.Schema.ServiceImport do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Service, Stack}

  schema "service_imports" do
    belongs_to :service, Service
    belongs_to :stack,   Stack

    has_many :outputs, through: [:stack, :output]

    timestamps()
  end

  @valid ~w(service_id stack_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:service_id)
    |> foreign_key_constraint(:stack_id)
    |> validate_required(~w(stack_id)a)
  end
end
