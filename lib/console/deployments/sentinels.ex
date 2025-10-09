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
  alias Console.Deployments.Settings

  @type error :: Console.error
  @type sentinel_resp :: {:ok, Sentinel.t} | error
  @type sentinel_run_resp :: {:ok, SentinelRun.t} | error
  @type sentinel_run_job_resp :: {:ok, SentinelRunJob.t} | error

  def get_sentinel!(id), do: Repo.get!(Sentinel, id)
  def get_sentinel(id), do: Repo.get(Sentinel, id)

  def get_sentinel_run!(id), do: Repo.get!(SentinelRun, id)
  def get_sentinel_run(id), do: Repo.get(SentinelRun, id)

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
      |> Sentinel.changeset(attrs)
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
      |> Sentinel.changeset(%{last_run_at: DateTime.utc_now()})
      |> allow(user, :read)
      |> when_ok(:update)
    end)
    |> add_operation(:run, fn %{fetch: sentinel} ->
      %SentinelRun{sentinel_id: sentinel.id, status: :pending}
      |> Repo.insert()
    end)
    |> execute(extract: :run)
  end

  @spec spawn_jobs(Sentinel.t, binary) :: {:ok, integer} | error
  def spawn_jobs(%SentinelRun{id: id} = sentinel, check_name) do
    with %SentinelRun{sentinel: %Sentinel{checks: [_ | _] = checks}} <- Repo.preload(sentinel, :sentinel),
         %SentinelCheck{
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
end
