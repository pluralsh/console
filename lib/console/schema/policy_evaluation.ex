defmodule Console.Schema.PolicyEvaluation do
  use Console.Schema.Base

  schema "policy_evaluations" do
    field :policy_ids, {:array, :binary_id}
    field :input,      :map
    field :output,     :map

    timestamps()
  end

  def for_policy(query \\ __MODULE__, policy_id) do
    from(p in query, where: fragment("? @> ARRAY[?]::uuid[]", p.policy_ids, type(^policy_id, :binary_id)))
  end

  def counts_for_policies([]), do: %{}
  def counts_for_policies(policy_ids) do
    requested = MapSet.new(policy_ids)

    from(p in __MODULE__,
      where: fragment("? && ?::uuid[]", p.policy_ids, type(^policy_ids, {:array, :binary_id})),
      select: p.policy_ids
    )
    |> Console.Repo.all()
    |> Enum.reduce(%{}, fn ids, acc ->
      Enum.reduce(ids, acc, fn id, acc ->
        if MapSet.member?(requested, id), do: Map.update(acc, id, 1, &(&1 + 1)), else: acc
      end)
    end)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(p in query, order_by: ^order)
  end

  def expired(query \\ __MODULE__, now \\ Timex.shift(Timex.now(), weeks: -1)) do
    from(p in query, where: p.inserted_at < ^now)
  end

  def with_ids(query \\ __MODULE__, ids) do
    from(p in query, where: p.id in ^ids)
  end

  @valid ~w(policy_ids input output)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid)
    |> validate_length(:policy_ids, min: 1, max: 300)
  end
end
