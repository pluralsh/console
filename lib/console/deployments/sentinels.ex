defmodule Console.Deployments.Sentinels do
  use Console.Services.Base
  import Console.Deployments.Policies
  import Console.Prom.Plugin, only: [metric_scope: 1]
  alias Console.Schema.{
    User,
    Sentinel,
    Cluster,
    GitRepository,
    SentinelRun,
    SentinelRunJob,
    Sentinel.SentinelCheck
  }
  alias Console.PubSub
  alias Kazan.Apis.Batch.V1, as: BatchV1
  alias Console.Deployments.{Settings, Clusters}
  alias Console.Deployments.Git.Discovery

  @type error :: Console.error
  @type sentinel_resp :: {:ok, Sentinel.t} | error
  @type sentinel_run_resp :: {:ok, SentinelRun.t} | error
  @type sentinel_run_job_resp :: {:ok, SentinelRunJob.t} | error

  def get_sentinel!(id), do: Repo.get!(Sentinel, id)
  def get_sentinel(id), do: Repo.get(Sentinel, id)

  def get_sentinel_run!(id), do: Repo.get!(SentinelRun, id)
  def get_sentinel_run(id), do: Repo.get(SentinelRun, id)

  def get_sentinel_run_job!(id), do: Repo.get!(SentinelRunJob, id)
  def get_sentinel_run_job(id), do: Repo.get(SentinelRunJob, id)

  def get_sentinel_by_name(name), do: Repo.get_by(Sentinel, name: name)
  def get_sentinel_by_name!(name), do: Repo.get_by!(Sentinel, name: name)

  @spec authorized_job(binary, Cluster.t) :: sentinel_run_job_resp
  def authorized_job(id, %Cluster{} = cluster) do
    get_sentinel_run_job!(id)
    |> allow(cluster, :read)
  end

  @doc """
  Creates a new sentinel, with inferred project id if necessary
  """
  @spec create_sentinel(map, User.t) :: sentinel_resp
  def create_sentinel(attrs, %User{} = user) do
    %Sentinel{}
    |> Sentinel.changeset(
      Settings.add_project_id(attrs, user)
      |> Map.put(:last_run_at, Timex.now())
    )
    |> allow(user, :write)
    |> when_ok(:insert)
  end

  @doc """
  Updates an existing sentinel
  """
  @spec update_sentinel(map, binary, User.t) :: sentinel_resp
  def update_sentinel(attrs, id, %User{} = user) do
    start_transaction()
    |> add_operation(:fetch, fn _ ->
      get_sentinel!(id)
      |> allow(user, :write)
    end)
    |> add_operation(:update, fn %{fetch: sentinel} ->
      sentinel
      |> Sentinel.changeset(Map.delete(attrs, :status))
      |> allow(user, :write)
      |> when_ok(:update)
    end)
    |> execute(extract: :update)
  end

  @doc """
  Deletes an existing sentinel
  """
  @spec delete_sentinel(binary, User.t) :: sentinel_resp
  def delete_sentinel(id, %User{} = user) do
    get_sentinel!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
  end

  @doc """
  Runs a sentinel if the user has read access to the sentinel
  """
  @spec run_sentinel(map, binary | Sentinel.t(), User.t()) :: sentinel_run_resp
  def run_sentinel(overrides, id, %User{} = user) when is_binary(id),
    do: run_sentinel(overrides, get_sentinel!(id), user)

  def run_sentinel(overrides, %Sentinel{} = sentinel, %User{} = user) do
    with {:ok, sentinel} <- allow(sentinel, user, :read) do
      run_sentinel(overrides, sentinel)
    end
  end

  @doc """
  Marks a sentinel as having been run
  """
  @spec mark_ran(Sentinel.t) :: sentinel_resp
  def mark_ran(%Sentinel{} = sentinel) do
    Sentinel.changeset(sentinel, %{last_run_at: DateTime.utc_now()})
    |> Repo.update()
  end

  @doc """
  Runs a sentinel directly
  """
  @spec run_sentinel(map, Sentinel.t) :: sentinel_run_resp
  def run_sentinel(overrides \\ %{}, %Sentinel{} = sentinel) do
    start_transaction()
    |> add_operation(:update, fn _ ->
      sentinel
      |> Sentinel.changeset(%{last_run_at: DateTime.utc_now(), status: :pending})
      |> Repo.update()
    end)
    |> add_operation(:run, fn %{update: sentinel} ->
      %SentinelRun{sentinel_id: sentinel.id, status: :pending}
      |> SentinelRun.changeset(%{checks: Console.mapify(apply_overrides(overrides, sentinel.checks))})
      |> Repo.insert()
    end)
    |> execute(extract: :run)
    |> record_status(nil)
    |> notify(:create)
  end

  defp apply_overrides(%{tags: %{} = tags}, checks) do
    Enum.map(checks, fn
      %SentinelCheck{type: :integration_test, configuration: %{integration_test: %{}}} = check ->
        update_in(check.configuration.integration_test.tags, &Map.merge(&1 || %{}, tags))
      check -> check
    end)
  end
  defp apply_overrides(_, checks), do: checks

  @doc """
  Fetches a file handle to the tarball for a stack run
  """
  @spec tarstream(SentinelRunJob.t) :: {:ok, File.t} | error
  def tarstream(%SentinelRunJob{} = run) do
    case Repo.preload(run, [:repository]) do
      %{repository: %GitRepository{} = repo, git: git} ->
        Discovery.fetch(repo, git)
      _ -> {:error, "could not resolve repository for run"}
    end
  end

  @spec spawn_jobs(SentinelRun.t, binary) :: {:ok, integer} | error
  def spawn_jobs(%SentinelRun{id: id, checks: [_ | _] = checks}, check_name) do
    with %SentinelCheck{
           type: :integration_test,
           configuration: %SentinelCheck.CheckConfiguration{integration_test: test}
         } <- Enum.find(checks, & &1.name == check_name) do
      Cluster.target(test)
      |> Cluster.ordered(asc: :id)
      |> Repo.stream(method: :keyset)
      |> Stream.chunk_every(100)
      |> Stream.map(fn chunk ->
        attrs = Enum.map(chunk, fn cluster -> timestamped(%{
          cluster_id: cluster.id,
          check: check_name,
          sentinel_run_id: id,
          format: test.format,
          status: :pending,
          job: test.job,
          git: test.git,
          repository_id: test.repository_id,
        }) end)

        {count, jobs} = Repo.insert_all(SentinelRunJob, attrs, returning: true)
        Enum.each(jobs, &handle_notify(PubSub.SentinelRunJobCreated, &1))
        Enum.each(chunk, fn cluster ->
          :telemetry.execute(
            metric_scope(:sentinel_run_job),
            %{count: 1},
            %{status: :pending, sentinel_run_id: id, cluster: cluster.handle}
          )
        end)

        count
      end)
      |> Enum.sum()
      |> ok()
    else
      _ -> {:error, "Check not found"}
    end
  end

  @spec update_sentinel_job(map, binary, Cluster.t) :: sentinel_run_job_resp
  def update_sentinel_job(attrs, id, %Cluster{} = cluster) when is_binary(id) do
    job = Repo.get!(SentinelRunJob, id)

    job
    |> SentinelRunJob.changeset(attrs)
    |> allow(cluster, :write)
    |> when_ok(:update)
    |> record_status(job, %{cluster: cluster.handle})
    |> notify(:update)
  end

  @doc """
  Attempts to fetch the job resource for the given sentinel from k8s
  """
  @spec run_job(SentinelRunJob.t) :: {:ok, BatchV1.Job.t} | error
  def run_job(%SentinelRunJob{reference: %{namespace: ns, name: name}} = rj) do
    %SentinelRunJob{cluster: cluster} = Repo.preload(rj, [:cluster])
    Clusters.control_plane(cluster)
    |> Kube.Utils.save_kubeconfig()

    BatchV1.read_namespaced_job!(ns, name)
    |> Kube.Utils.run()
  end
  def run_job(_), do: {:ok, nil}

  def autokill() do
    SentinelRun.stalled()
    |> SentinelRun.ordered(asc: :id)
    |> Repo.stream(method: :keyset)
    |> Enum.each(fn run ->
      run
      |> SentinelRun.changeset(%{status: :failed})
      |> Repo.update()
      |> record_status(run)
      |> notify(:update)
    end)
  end

  @doc """
  Increments the sentinel run or run job status counter if `result` moved the record out of the status of `previous`,
  merging `metadata` into the telemetry event (eg the cluster handle for run jobs)
  """
  @spec record_status({:ok, SentinelRun.t | SentinelRunJob.t} | error, SentinelRun.t | SentinelRunJob.t | nil, map) ::
    {:ok, SentinelRun.t | SentinelRunJob.t} | error
  def record_status(result, previous, metadata \\ %{})
  def record_status({:ok, %{status: status} = record} = result, previous, metadata) do
    case previous do
      %{status: ^status} -> :ok
      _ ->
        :telemetry.execute(
          status_scope(record),
          %{count: 1},
          Map.merge(metadata, %{status: status, sentinel_run_id: run_id(record)})
        )
    end
    result
  end
  def record_status(pass, _, _), do: pass

  defp status_scope(%SentinelRun{}), do: metric_scope(:sentinel_run)
  defp status_scope(%SentinelRunJob{}), do: metric_scope(:sentinel_run_job)

  defp run_id(%SentinelRun{id: id}), do: id
  defp run_id(%SentinelRunJob{sentinel_run_id: id}), do: id

  defp notify({:ok, %SentinelRun{} = sentinel}, :create),
    do: handle_notify(PubSub.SentinelRunCreated, sentinel)
  defp notify({:ok, %SentinelRun{} = sentinel}, :update),
    do: handle_notify(PubSub.SentinelRunUpdated, sentinel)
  defp notify({:ok, %SentinelRunJob{} = job}, :update),
    do: handle_notify(PubSub.SentinelRunJobUpdated, job)
  defp notify(pass, _), do: pass
end
