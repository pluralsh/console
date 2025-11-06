defmodule Console.Schema.ResearchAssociation do
  use Console.Schema.Base
  alias Console.Schema.{InfraResearch, Stack, Service}

  schema "research_associations" do
    belongs_to :research, InfraResearch
    belongs_to :stack,    Stack
    belongs_to :service,  Service

    timestamps()
  end

  @valid ~w(research_id stack_id service_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:research_id)
    |> foreign_key_constraint(:stack_id)
    |> foreign_key_constraint(:service_id)
  end
end
