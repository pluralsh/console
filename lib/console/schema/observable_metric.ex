defmodule Console.Schema.ObservableMetric do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Stack, PipelineGate, ObservabilityProvider}

  defenum Action, block: 0, warn: 1

  schema "observable_metrics" do
    field :identifier, :string
    field :action,     Action

    belongs_to :stack,    Stack
    belongs_to :gate,     PipelineGate
    belongs_to :provider, ObservabilityProvider

    timestamps()
  end

  @valid ~w(identifier action provider_id stack_id gate_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:provider_id)
    |> foreign_key_constraint(:gate_id)
    |> foreign_key_constraint(:stack_id)
    |> validate_required([:identifier])
  end
end
