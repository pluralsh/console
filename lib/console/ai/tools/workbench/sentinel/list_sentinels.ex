defmodule Console.AI.Tools.Workbench.Sentinel.ListSentinels do
  use Console.AI.Tools.Agent.Base
  alias Console.Repo
  alias Console.Schema.{Sentinel, SentinelRun, User}

  embedded_schema do
    field :user, :map, virtual: true
    field :q, :string
    field :status, SentinelRun.Status
    field :limit, :integer, default: 25
  end

  @valid ~w(q status limit)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_number(:limit, greater_than: 0, less_than_or_equal_to: 50)
  end

  @json_schema Console.priv_file!("tools/workbench/sentinel/list_sentinels.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "plrl_list_sentinels"
  def description(_), do: "List Plural sentinels visible to the current user, optionally filtered by status or search query.  These provide thorough integration tests at the infrastructure or kubernetes level."

  def implement(%__MODULE__{user: %User{} = user, q: q, status: status, limit: limit}) do
    limit = limit || 25

    Sentinel.ordered()
    |> Sentinel.for_user(user)
    |> maybe_status(status)
    |> maybe_search(q)
    |> Sentinel.limit(limit)
    |> Repo.all()
    |> Enum.map(&sentinel_brief/1)
    |> Jason.encode()
  end

  defp maybe_status(query, status) when not is_nil(status), do: Sentinel.for_status(query, status)
  defp maybe_status(query, _), do: query

  defp maybe_search(query, q) when is_binary(q) and byte_size(q) > 0, do: Sentinel.search(query, q)
  defp maybe_search(query, _), do: query

  defp sentinel_brief(%Sentinel{} = sentinel) do
    Map.take(sentinel, [:id, :name, :description, :status, :last_run_at, :next_run_at, :project_id, :repository_id])
    |> Map.put(:checks, Enum.map(sentinel.checks || [], &check_brief/1))
  end

  defp check_brief(check), do: Map.take(check, [:name, :type, :rule_file])
end
