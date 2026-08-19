defmodule Console.Schema.WorkbenchPolicy do
  use Console.Schema.Base
  alias Console.Schema.{Policy, Workbench}

  schema "workbench_policies" do
    embeds_one :matches, Matches, on_replace: :update do
      field :regexes, {:array, :string}
      field :parsed_regexes, {:array, :map}, virtual: true
      field :ignore, {:array, :string}
    end

    belongs_to :policy,    Policy
    belongs_to :workbench, Workbench

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

  def ordered(query \\ __MODULE__, order \\ [asc: :insert_at]) do
    from(p in query, order_by: ^order)
  end

  @valid ~w(policy_id workbench_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:matches, with: &matches_changeset/2)
    |> foreign_key_constraint(:policy_id)
    |> foreign_key_constraint(:workbench_id)
    |> unique_constraint([:policy_id, :workbench_id])
    |> validate_required([:policy_id, :workbench_id])
  end

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
