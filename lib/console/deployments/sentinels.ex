defmodule Console.Deployments.Sentinels do
  use Console.Services.Base
  import Console.Deployments.Policies
  alias Console.Schema.{
    User,
    Sentinel,
    Cluster,
    SentinelRun,
    SentinelRunJob,
    Sentinel.SentinelCheck
  }
  alias Kazan.Apis.Batch.V1, as: BatchV1
  alias Console.Deployments.{Settings, Clusters}

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

  @doc """
  Creates a new sentinel, with inferred project id if necessary
  """
  @spec create_sentinel(map, User.t) :: sentinel_resp
  def create_sentinel(attrs, %User{} = user) do
    %Sentinel{}
    |> Sentinel.changeset(Settings.add_project_id(attrs, user))
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
  Runs a sentinel
  """
  @spec run_sentinel(binary, User.t) :: sentinel_run_resp
  def run_sentinel(id, %User{} = user) do
    start_transaction()
    |> add_operation(:fetch, fn _ ->
      get_sentinel!(id)
      |> Sentinel.changeset(%{last_run_at: DateTime.utc_now(), status: :pending})
      |> allow(user, :read)
      |> when_ok(:update)
    end)
    |> add_operation(:run, fn %{fetch: sentinel} ->
      %SentinelRun{sentinel_id: sentinel.id, status: :pending}
      |> SentinelRun.changeset(%{checks: Console.mapify(sentinel.checks)})
      |> Repo.insert()
    end)
    |> execute(extract: :run)
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
        }) end)

        {count, _} = Repo.insert_all(SentinelRunJob, attrs)
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
    Repo.get!(SentinelRunJob, id)
    |> SentinelRunJob.changeset(attrs)
    |> allow(cluster, :write)
    |> when_ok(:update)
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
    |> IO.inspect(label: "job output")
  end
  def run_job(_), do: {:ok, nil}
end
