defmodule Console.Schema.StackPolicy do
  use Console.Schema.Base
  alias Console.Schema.{BindingPolicy, Policy, Stack}

  defenum Type, approval: 0, run: 1

  schema "stack_policies" do
    belongs_to :policy,         Policy
    belongs_to :stack,          Stack
    belongs_to :binding_policy, BindingPolicy

    field :type, Type, default: :approval

    timestamps()
  end

  def for_stack(query \\ __MODULE__, stack_id) do
    from(p in query, where: p.stack_id == ^stack_id)
  end

  def for_policy(query \\ __MODULE__, policy_id) do
    from(p in query, where: p.policy_id == ^policy_id)
  end

  def for_binding(query \\ __MODULE__, binding_id) do
    from(p in query, where: p.binding_policy_id == ^binding_id)
  end

  def for_type(query \\ __MODULE__, type) do
    from(p in query, where: p.type == ^type)
  end

  def counts_for_policies([]), do: %{}
  def counts_for_policies(policy_ids) do
    from(p in __MODULE__,
      where: p.policy_id in ^policy_ids,
      group_by: p.policy_id,
      select: {p.policy_id, count(p.id)}
    )
    |> Console.Repo.all()
    |> Map.new()
  end

  @valid ~w(policy_id stack_id type binding_policy_id)a
  @required ~w(policy_id stack_id type)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:policy_id)
    |> foreign_key_constraint(:stack_id)
    |> foreign_key_constraint(:binding_policy_id)
    |> unique_constraint([:policy_id, :stack_id, :type])
    |> unique_constraint([:binding_policy_id, :stack_id], name: :stack_policies_binding_id_stack_id_index)
    |> validate_required(@required)
  end

  def upsert(attrs) do
    %__MODULE__{}
    |> changeset(attrs)
    |> Console.Repo.insert(
      on_conflict: on_conflict_type(),
      conflict_target: {:unsafe_fragment, "(binding_policy_id, stack_id) WHERE binding_policy_id IS NOT NULL"},
      returning: true,
      stale_error_field: :id
    )
    |> normalize_upsert()
  end

  defp on_conflict_type do
    from(s in __MODULE__,
      update: [set: [
        type: fragment("EXCLUDED.type"),
        updated_at: fragment("EXCLUDED.updated_at")
      ]],
      where: fragment("? IS DISTINCT FROM EXCLUDED.type", s.type)
    )
  end

  defp normalize_upsert({:error, %Ecto.Changeset{errors: errors} = changeset}) do
    case Enum.any?(errors, &stale_error?/1) do
      true -> :ok
      false -> {:error, changeset}
    end
  end
  defp normalize_upsert(result), do: result

  defp stale_error?({_, {_, opts}}), do: opts[:stale] == true
  defp stale_error?(_), do: false
end
