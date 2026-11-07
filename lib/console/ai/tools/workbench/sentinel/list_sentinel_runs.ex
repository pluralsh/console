defmodule Console.AI.Tools.Workbench.Sentinel.ListSentinelRuns do
  use Console.AI.Tools.Agent.Base
  import Console.Deployments.Policies, only: [allow: 3]
  alias Console.Repo
  alias Console.Deployments.Sentinels
  alias Console.AI.Tools.Workbench.Sentinel.FetchSentinelRun
  alias Console.Schema.{Sentinel, SentinelRun, User}

  embedded_schema do
    field :user,        :map, virtual: true
    field :sentinel_id, :string
    field :status,      SentinelRun.Status
    field :limit,       :integer, default: 10
  end

  @valid ~w(sentinel_id status limit)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> check_uuid(:sentinel_id)
    |> validate_required([:sentinel_id])
    |> validate_number(:limit, greater_than: 0, less_than_or_equal_to: 25)
  end

  @json_schema Console.priv_file!("tools/workbench/sentinel/list_sentinel_runs.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "plrl_sentinel_runs"
  def description(_), do: "List the most recent runs of a Plural sentinel, newest first, with per-check results.  Useful for finding when a sentinel started failing and comparing passing vs failing runs."

  def implement(%__MODULE__{user: %User{} = user, sentinel_id: id, status: status, limit: limit}) do
    with %Sentinel{} = sentinel <- Sentinels.get_sentinel(id),
         {:ok, _} <- allow(sentinel, user, :read) do
      SentinelRun.for_sentinel(id)
      |> maybe_status(status)
      |> SentinelRun.ordered()
      |> SentinelRun.with_limit(limit || 10)
      |> SentinelRun.preloaded([:errors])
      |> Repo.all()
      |> Enum.map(&FetchSentinelRun.run_brief/1)
      |> Jason.encode()
    else
      nil -> {:error, "could not find sentinel with id #{id}"}
      {:error, err} -> {:error, "failed to list sentinel runs, reason: #{inspect(err)}"}
      error -> error
    end
  end

  defp maybe_status(query, nil), do: query
  defp maybe_status(query, status), do: SentinelRun.for_status(query, status)
end
