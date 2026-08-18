defmodule Console.Schema.StackPolicy do
  use Console.Schema.Base
  alias Console.Schema.{Policy, Stack}

  schema "stack_policies" do
    belongs_to :policy, Policy
    belongs_to :stack, Stack

    timestamps()
  end

  def for_stack(query \\ __MODULE__, stack_id) do
    from(p in query, where: p.stack_id == ^stack_id)
  end

  def for_policy(query \\ __MODULE__, policy_id) do
    from(p in query, where: p.policy_id == ^policy_id)
  end

  @valid ~w(policy_id stack_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:policy_id)
    |> foreign_key_constraint(:stack_id)
    |> unique_constraint([:policy_id, :stack_id])
    |> validate_required(@valid)
  end
end
