defmodule Console.Schema.WorkbenchPolicy do
  use Console.Schema.Base
  alias Console.Schema.{BindingPolicy, Policy, Workbench}

  schema "workbench_policies" do
    embeds_one :matches, Matches, on_replace: :update do
      field :regexes, {:array, :string}
      field :parsed_regexes, {:array, :map}, virtual: true
      field :ignore, {:array, :string}
    end

    belongs_to :policy,          Policy
    belongs_to :workbench,       Workbench
    belongs_to :binding_policy,  BindingPolicy

    timestamps()
  end

  def compile(%__MODULE__{matches: %{regexes: [_ | _] = regexes}} = model) do
    put_in(model.matches.parsed_regexes, Enum.map(regexes, &Regex.compile!/1))
  end
  def compile(model), do: model

  def for_workbench(query \\ __MODULE__, workbench_id) do
    from(p in query, where: p.workbench_id == ^workbench_id)
  end

  def for_policy(query \\ __MODULE__, policy_id) do
    from(p in query, where: p.policy_id == ^policy_id)
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

  def ordered(query \\ __MODULE__, order \\ [asc: :insert_at]) do
    from(p in query, order_by: ^order)
  end

  @valid ~w(policy_id workbench_id binding_policy_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:matches, with: &matches_changeset/2)
    |> foreign_key_constraint(:policy_id)
    |> foreign_key_constraint(:workbench_id)
    |> foreign_key_constraint(:binding_policy_id)
    |> unique_constraint([:policy_id, :workbench_id])
    |> validate_required([:policy_id, :workbench_id])
  end

  def upsert(attrs) do
    %__MODULE__{}
    |> changeset(attrs)
    |> Console.Repo.insert(
      on_conflict: on_conflict_matches(),
      conflict_target: [:policy_id, :workbench_id],
      returning: true,
      stale_error_field: :id
    )
    |> normalize_upsert()
  end

  defp on_conflict_matches do
    from(w in __MODULE__,
      update: [set: [
        matches: fragment("EXCLUDED.matches"),
        updated_at: fragment("EXCLUDED.updated_at")
      ]],
      where: fragment("? = EXCLUDED.binding_policy_id", w.binding_policy_id),
      where: fragment("? IS DISTINCT FROM EXCLUDED.matches", w.matches)
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

  def matches_changeset(model, attrs) do
    model
    |> cast(attrs, [:regexes, :ignore])
    |> validate_required([:regexes])
    |> validate_change(:regexes, fn :regexes, regexes ->
      Enum.flat_map(regexes, fn regex ->
        case Regex.compile(regex) do
          {:ok, _} -> []
          {:error, reason} -> [regexes: "Invalid regex #{regex}: #{inspect(reason)}"]
        end
      end)
    end)
  end
end
