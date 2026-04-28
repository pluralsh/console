defmodule Console.Schema.StackInfracostResource do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Stack, StackRun, StackState}

  @scopes ~w(breakdown past_breakdown diff free)

  schema "stack_infracost_resources" do
    field :resource_scope, :string
    field :project_name,   :string
    field :name,           :string
    field :resource_type,  :string

    field :hourly_cost,        :decimal
    field :monthly_cost,       :decimal
    field :monthly_usage_cost, :decimal

    field :raw_resource, :map

    belongs_to :stack,       Stack
    belongs_to :stack_run,   StackRun
    belongs_to :stack_state, StackState

    timestamps()
  end

  @cast ~w(resource_scope project_name name resource_type
           hourly_cost monthly_cost monthly_usage_cost
           raw_resource stack_id stack_run_id stack_state_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @cast)
    |> foreign_key_constraint(:stack_id)
    |> foreign_key_constraint(:stack_run_id)
    |> foreign_key_constraint(:stack_state_id)
    |> validate_required(~w(resource_scope name stack_id stack_run_id)a)
    |> validate_inclusion(:resource_scope, @scopes)
    |> put_new_change(:id, &Piazza.Ecto.UUID.generate_monotonic/0)
  end
end
