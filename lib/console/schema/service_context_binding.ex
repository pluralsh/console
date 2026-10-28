defmodule Console.Schema.ServiceContextBinding do
  use Console.Schema.Base
  alias Console.Schema.{Service, ServiceContext}

  schema "service_context_bindings" do
    belongs_to :service, Service
    belongs_to :context, ServiceContext

    timestamps()
  end

  @valid ~w(service_id context_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:service_id)
    |> foreign_key_constraint(:context_id)
  end
end
