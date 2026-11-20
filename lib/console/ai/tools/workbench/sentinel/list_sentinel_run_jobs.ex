defmodule Console.AI.Tools.Workbench.Sentinel.ListSentinelRunJobs do
  use Console.AI.Tools.Agent.Base
  import Console.Deployments.Policies, only: [allow: 3]
  alias Console.Repo
  alias Console.Deployments.Sentinels
  alias Console.Schema.{SentinelRun, SentinelRunJob, User}

  @error_preview 500

  embedded_schema do
    field :user,            :map, virtual: true
    field :sentinel_run_id, :string
    field :status,          SentinelRunJob.Status
    field :check,           :string
    field :cluster,         :string
    field :limit,           :integer, default: 25
  end

  @valid ~w(sentinel_run_id status check cluster limit)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> check_uuid(:sentinel_run_id)
    |> validate_required([:sentinel_run_id])
    |> validate_number(:limit, greater_than: 0, less_than_or_equal_to: 100)
  end

  @json_schema Console.priv_file!("tools/workbench/sentinel/list_sentinel_run_jobs.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "plrl_sentinel_run_jobs"
  def description(_), do: "List the integration test jobs of a Plural sentinel run, optionally filtered by status, check name or cluster handle.  Returns each job's cluster and any runtime error, use plrl_sentinel_run_job for full test output."

  def implement(%__MODULE__{user: %User{} = user, sentinel_run_id: id, limit: limit} = args) do
    with %SentinelRun{} = run <- Sentinels.get_sentinel_run(id),
         {:ok, _} <- allow(run, user, :read) do
      SentinelRunJob.for_sentinel_run(id)
      |> filters(args)
      |> SentinelRunJob.ordered()
      |> SentinelRunJob.with_limit(limit || 25)
      |> SentinelRunJob.preloaded([:cluster])
      |> Repo.all()
      |> Enum.map(&job_brief/1)
      |> Jason.encode()
    else
      nil -> {:error, "could not find sentinel run with id #{id}"}
      {:error, err} -> {:error, "failed to list sentinel run jobs, reason: #{inspect(err)}"}
      error -> error
    end
  end

  defp filters(query, args) do
    Enum.reduce(Map.take(args, [:status, :check, :cluster]), query, fn
      {_, nil}, q -> q
      {:status, status}, q -> SentinelRunJob.for_status(q, status)
      {:check, check}, q -> SentinelRunJob.for_check(q, check)
      {:cluster, handle}, q -> SentinelRunJob.for_cluster_handle(q, handle)
    end)
  end

  defp job_brief(%SentinelRunJob{} = job) do
    Map.take(job, [:id, :check, :status, :format, :completed_at, :inserted_at])
    |> Map.put(:cluster, cluster_brief(job.cluster))
    |> Map.put(:error, preview(job.error))
    |> Map.put(:k8s_job, job.reference && Map.take(job.reference, [:namespace, :name]))
  end

  defp cluster_brief(%{id: id, handle: handle, distro: distro}), do: %{id: id, handle: handle, distro: distro}
  defp cluster_brief(_), do: nil

  defp preview(err) when is_binary(err) and byte_size(err) > @error_preview,
    do: String.slice(err, 0, @error_preview) <> "..."
  defp preview(err), do: err
end
