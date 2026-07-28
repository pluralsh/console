defmodule Console.AI.Tools.Workbench.Sentinel.FetchSentinelRun do
  use Console.AI.Tools.Agent.Base
  import Console.Deployments.Policies, only: [allow: 3]
  alias Console.Repo
  alias Console.Deployments.Sentinels
  alias Console.Schema.{SentinelRun, User}

  embedded_schema do
    field :user, :map, virtual: true
    field :sentinel_run_id, :string
  end

  @valid ~w(sentinel_run_id)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> check_uuid(:sentinel_run_id)
    |> validate_required([:sentinel_run_id])
  end

  @json_schema Console.priv_file!("tools/workbench/sentinel/fetch_sentinel_run.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "plrl_sentinel_run"
  def description(_), do: "Fetch a Plural sentinel run by id, with run jobs compressed to id and status."

  def implement(%__MODULE__{user: %User{} = user, sentinel_run_id: id}) do
    with %SentinelRun{} = run <- Sentinels.get_sentinel_run(id),
         {:ok, run} <- allow(run, user, :read) do
      run
      |> Repo.preload([:jobs])
      |> run_summary()
      |> Jason.encode()
    else
      nil -> {:error, "could not find sentinel run with id #{id}"}
      {:error, err} -> {:error, "failed to fetch sentinel run, reason: #{inspect(err)}"}
      error -> error
    end
  end

  def run_summary(%SentinelRun{} = run) do
    Map.take(run, [:id, :status, :sentinel_id, :completed_at, :polled_at, :inserted_at, :updated_at])
    |> Map.put(:results, Enum.map(run.results || [], &result_summary/1))
    |> Map.put(:jobs, jobs_summary(run.jobs))
  end

  defp result_summary(result),
    do: Map.take(result, [:name, :status, :reason, :job_count, :successful_count, :failed_count])

  defp job_summary(job), do: %{id: job.id, status: job.status}

  defp jobs_summary(jobs) when is_list(jobs), do: Enum.map(jobs, &job_summary/1)
  defp jobs_summary(_), do: []
end
