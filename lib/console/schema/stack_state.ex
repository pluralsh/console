defmodule Console.Schema.StackState do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Stack, StackRun}

  schema "stack_states" do
    field :plan, :binary

    embeds_many :state, StateItem do
      field :identifier,    :string
      field :resource,      :string
      field :name,          :string
      field :configuration, :map
      field :links,         {:array, :string}
    end

    belongs_to :stack, Stack
    belongs_to :run,   StackRun
  end

  @valid ~w(plan stack_id run_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:state, with: &state_changeset/2)
  end

  defp state_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(identifier resource name configuration links)a)
    |> validate_required(~w(identifier)a)
  end
end
