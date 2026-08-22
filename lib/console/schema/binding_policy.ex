defmodule Console.Schema.BindingPolicy do
  use Console.Schema.Base
  alias Console.Schema.{Policy, WorkbenchPolicy, StackPolicy}

  defenum Type, workbench: 0, stack: 1

  schema "binding_policies" do
    field :type,         Type, default: :workbench
    field :interval,     :string, default: "1h"
    field :next_poll_at, :utc_datetime_usec

    embeds_one :matches, Spec, on_replace: :update do
      embeds_one :workbench, WorkbenchPolicy.Matches, on_replace: :update

      embeds_one :stack, StackSpec, on_replace: :update do
        field :type, StackPolicy.Type, default: :approval
      end
    end

    belongs_to :policy, Policy
    belongs_to :bind_policy, Policy

    timestamps()
  end

  def for_policy(query \\ __MODULE__, policy_id) do
    from(p in query, where: p.policy_id == ^policy_id)
  end

  def for_project(query \\ __MODULE__, project_id) do
    from(p in query,
      join: policy in assoc(p, :policy),
      where: policy.project_id == ^project_id
    )
  end

  def for_type(query \\ __MODULE__, type) do
    from(p in query, where: p.type == ^type)
  end

  def for_user(query \\ __MODULE__, user) do
    projects = Console.Schema.Project.for_user(user)

    from(p in query,
      join: policy in assoc(p, :policy),
      join: policy_project in subquery(projects),
      on: policy_project.id == policy.project_id,
      join: bind_policy in assoc(p, :bind_policy),
      join: bind_policy_project in subquery(projects),
      on: bind_policy_project.id == bind_policy.project_id
    )
  end

  def pollable(query \\ __MODULE__) do
    now = DateTime.utc_now()
    from(p in query, where: is_nil(p.next_poll_at) or p.next_poll_at < ^now, order_by: [asc: :next_poll_at])
  end

    @valid ~w(policy_id bind_policy_id type interval)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:matches, with: &spec_changeset/2)
    |> duration(:interval)
    |> validate_interval()
    |> default_next_poll()
    |> foreign_key_constraint(:policy_id)
    |> foreign_key_constraint(:bind_policy_id)
    |> validate_required([:policy_id, :bind_policy_id, :type])
  end

  def next_poll_changeset(model, interval) do
    duration = poll_duration(interval)
    jittered = Duration.add(duration, Duration.new!(second: jitter(duration)))

    Ecto.Changeset.change(model, %{next_poll_at: DateTime.shift(DateTime.utc_now(), jittered)})
  end

  def poll_duration(interval) when is_binary(interval) do
    case parse_duration(interval) do
      {:ok, duration} -> duration
      {:error, _} -> poll_duration(nil)
    end
  end
  def poll_duration(_), do: Duration.new!(hour: 1)

  def workbench_matches(%{matches: %{workbench: matches}}) when not is_nil(matches),
    do: Map.take(matches, [:regexes, :ignore])
  def workbench_matches(_), do: nil

  defp spec_changeset(model, attrs) do
    model
    |> cast(attrs, [])
    |> cast_embed(:workbench, with: &WorkbenchPolicy.matches_changeset/2)
    |> cast_embed(:stack, with: &stack_changeset/2)
    |> validate_required([])
  end

  defp stack_changeset(model, attrs) do
    model
    |> cast(attrs, [:type ])
  end

  defp validate_interval(changeset) do
    validate_change(changeset, :interval, fn :interval, interval ->
      with {:ok, duration} <- parse_duration(interval),
           true <- seconds(duration) >= 30 * 60 do
        []
      else
        _ -> [interval: "must be at least 30m"]
      end
    end)
  end

  defp default_next_poll(changeset) do
    case get_field(changeset, :next_poll_at) do
      nil -> put_change(changeset, :next_poll_at, DateTime.utc_now())
      _ -> changeset
    end
  end
end
