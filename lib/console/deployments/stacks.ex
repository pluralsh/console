defmodule Console.Deployments.Stacks do
  use Console.Services.Base
  import Console.Deployments.Policies
  import Console.Deployments.Stacks.Commands
  alias Console.PubSub
  alias Console.Deployments.Git.Discovery
  alias Console.Schema.{
    User,
    Cluster,
    Stack,
    StackRun,
    RunStep,
    RunLog,
    GitRepository
  }

  @preloads [:environment, :files]

  @type error :: Console.error
  @type stack_resp :: {:ok, Stack.t} | error
  @type run_resp :: {:ok, StackRun.t} | error
  @type step_resp :: {:ok, RunStep.t} | error
  @type log_resp :: {:ok, RunLog.t} | error

  @spec get_stack!(binary) :: Stack.t
  def get_stack!(id), do: Repo.get!(Stack, id)

  @spec get_run!(binary) :: StackRun.t
  def get_run!(id), do: Repo.get!(StackRun, id)

  @spec get_step!(binary) :: RunStep.t
  def get_step!(id), do: Repo.get!(RunStep, id)

  def preloaded(%Stack{} = stack), do: Repo.preload(stack, @preloads)

  @spec authorized(binary, Cluster.t) :: run_resp
  def authorized(run_id, cluster) do
    get_run!(run_id)
    |> allow(cluster, :read)
  end

  @doc """
  Creates a new stack if a user can write to its cluster
  """
  @spec create_stack(map, User.t) :: stack_resp
  def create_stack(attrs, %User{} = user) do
    %Stack{status: :queued}
    |> Stack.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(:insert)
    |> notify(:create, user)
  end

  @doc """
  Updates an existing stack
  """
  @spec update_stack(map, binary, User.t) :: stack_resp
  def update_stack(attrs, id, %User{} = user) do
    get_stack!(id)
    |> preloaded()
    |> Stack.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(:update)
    |> notify(:update, user)
  end

  @doc """
  It can delete a stack if the user has write perms
  """
  @spec detach_stack(binary, User.t) :: stack_resp
  def detach_stack(id, %User{} = user) do
    get_stack!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
    |> notify(:detach, user)
  end

  @doc """
  Schedules a stack to be destroyed
  """
  @spec delete_stack(binary, User.t) :: stack_resp
  def delete_stack(id, %User{} = user) do
    get_stack!(id)
    |> Stack.delete_changeset(%{deleted_at: Timex.now()})
    |> allow(user, :write)
    |> when_ok(:update)
    |> notify(:delete, user)
  end

  @doc """
  Updates basic attributes of a run, clusters and users are authorized to perform
  """
  @spec update_stack_run(map, binary, User.t | Cluster.t) :: run_resp
  def update_stack_run(attrs, id, actor) do
    start_transaction()
    |> add_operation(:run, fn _ ->
      get_run!(id)
      |> Repo.preload([:state])
      |> StackRun.update_changeset(attrs)
      |> allow(actor, :write)
      |> when_ok(:update)
    end)
    |> add_operation(:stack, &sync_stack_status(&1[:run]))
    |> execute(extract: :run)
    |> notify(:update)
  end


  @doc """
  It terminates a run in a completed state, and if successful, persists output/state information to the stack
  """
  @spec complete_stack_run(map, binary, User.t | Cluster.t) :: run_resp
  def complete_stack_run(attrs, id, actor) do
    start_transaction()
    |> add_operation(:run, fn _ ->
      get_run!(id)
      |> Repo.preload([:state, :output])
      |> StackRun.complete_changeset(attrs)
      |> allow(actor, :write)
      |> when_ok(:update)
    end)
    |> add_operation(:stack, &sync_stack_status(&1[:run]))
    |> execute(extract: :run)
    |> notify(:complete)
  end

  defp sync_stack_status(%StackRun{dry_run: false, status: :successful} = run) do
    %{state: state, output: output, stack: stack} = Repo.preload(run, [:state, :output, :stack])
    Repo.preload(stack, [:state, :output])
    |> Stack.complete_changeset(%{
      status: :successful,
      last_successful: run.git.ref,
      state: Console.clean(state),
      output: Enum.map(output, &Map.take(&1, ~w(name value secret)a))
    })
    |> Repo.update()
  end
  defp sync_stack_status(%StackRun{dry_run: false} = run) do
    get_stack!(run.stack_id)
    |> Stack.complete_changeset(%{status: run.status})
    |> Repo.update()
  end
  defp sync_stack_status(_), do: {:ok, %{}}

  @doc """
  Approves a stack run, only possible if user has write perms
  """
  @spec approve_stack_run(binary, User.t) :: run_resp
  def approve_stack_run(id, %User{} = user) do
    get_run!(id)
    |> StackRun.approve_changeset(%{approver_id: user.id, approved_at: Timex.now()})
    |> allow(user, :write)
    |> when_ok(:update)
    |> notify(:update)
  end

  @doc """
  Updates run step attributes, only achievable by a cluster
  """
  @spec update_run_step(map, binary, Cluster.t) :: step_resp
  def update_run_step(attrs, id, %Cluster{} = cluster) do
    get_step!(id)
    |> RunStep.update_changeset(attrs)
    |> allow(cluster, :write)
    |> when_ok(:update)
    |> notify(:update)
  end

  @doc """
  Add logs to a run step, only clusters are authorized
  """
  @spec add_run_logs(map, binary, Cluster.t) :: log_resp
  def add_run_logs(attrs, id, %Cluster{} = cluster) do
    %RunLog{step_id: id}
    |> RunLog.changeset(attrs)
    |> allow(cluster, :write)
    |> when_ok(:insert)
  end

  @doc """
  Polls a stack's git repo and creates a run if there's a new commit
  """
  @spec poll(Stack.t) :: run_resp
  def poll(%Stack{delete_run_id: id}) when is_binary(id),
    do: {:error, "stack is deleting"}

  def poll(%Stack{sha: sha} = stack) do
    %{repository: repo} = stack = Repo.preload(stack, [:repository, :environment])
    case Discovery.sha(repo, stack.git.ref) do
      {:ok, ^sha} -> {:error, "no new commit in repo"}
      {:ok, new_sha} -> create_run(stack, new_sha)
      err -> err
    end
  end

  @doc """
  Creates a new run for the stack with the given sha and optional additional attrs
  """
  @spec create_run(Stack.t, binary) :: run_resp
  def create_run(%Stack{} = stack, sha, attrs \\ %{}) do
    start_transaction()
    |> add_operation(:run, fn _ ->
      %StackRun{stack_id: stack.id, status: :queued}
      |> StackRun.changeset(
        Repo.preload(stack, [:environment, :files])
        |> Map.take(~w(approval configuration type environment files job_spec repository_id cluster_id)a)
        |> Console.clean()
        |> Map.put(:git, %{ref: sha, folder: stack.git.folder})
        |> Map.put(:steps, commands(stack, !!attrs[:dry_run]))
        |> Map.merge(attrs)
      )
      |> Repo.insert()
    end)
    |> add_operation(:stack, fn %{run: run} ->
      Ecto.Changeset.change(stack, %{sha: sha})
      |> Stack.delete_changeset(delete_run(stack, run))
      |> Repo.update()
    end)
    |> execute(extract: :run)
    |> notify(:create)
  end

  defp delete_run(%Stack{deleted_at: d}, %{id: id}) when not is_nil(d),
    do: %{delete_run_id: id}
  defp delete_run(_, _), do: %{}

  @doc """
  Fetches a file handle to the tarball for a stack run
  """
  @spec tarstream(StackRun.t) :: {:ok, File.t} | error
  def tarstream(%StackRun{} = run) do
    case Repo.preload(run, [:repository]) do
      %{repository: %GitRepository{} = repo, git: git} -> Discovery.fetch(repo, git)
      _ -> {:error, "could not resolve repository for run"}
    end
  end

  @doc """
  Adds errors to a stack run, used mostly in failed tarball fetches
  """
  @spec add_errors(StackRun.t, [map]) :: run_resp
  def add_errors(%StackRun{} = run, errors) do
    StackRun.update_changeset(run, %{errors: errors})
    |> Repo.update()
  end

  @doc """
  Determines if the stack has a run in progress
  """
  @spec running?(Stack.t) :: boolean
  def running?(%Stack{id: id}) do
    StackRun.for_stack(id)
    |> StackRun.running()
    |> StackRun.wet()
    |> Repo.exists?()
  end

  @doc """
  Checks to see if a stack run can be dequeued (all runs before it have terminated), and marks
  it as pending.
  """
  @spec dequeue(Stack.t) :: run_resp
  def dequeue(%Stack{} = stack) do
    unless running?(stack) do
      StackRun.for_stack(stack.id)
      |> StackRun.for_status(:queued)
      |> StackRun.ordered(asc: :id)
      |> StackRun.wet()
      |> StackRun.limit(1)
      |> Repo.one()
      |> case do
        nil -> {:error, "no pending runs"}
        %StackRun{} = run ->
          Ecto.Changeset.change(run, %{status: :pending})
          |> Repo.update()
          |> notify(:update)
      end
    else
      {:error, "stack is currently running"}
    end
  end

  defp notify({:ok, %Stack{} = stack}, :create, actor),
    do: handle_notify(PubSub.StackCreated, stack, actor: actor)
  defp notify({:ok, %Stack{} = stack}, :update, actor),
    do: handle_notify(PubSub.StackUpdated, stack, actor: actor)
  defp notify({:ok, %Stack{} = stack}, :delete, actor),
    do: handle_notify(PubSub.StackDeleted, stack, actor: actor)
  defp notify({:ok, %Stack{} = stack}, :detach, actor),
    do: handle_notify(PubSub.StackDetached, stack, actor: actor)
  defp notify(pass, _, _), do: pass

  defp notify({:ok, %StackRun{} = stack}, :create),
    do: handle_notify(PubSub.StackRunCreated, stack)
  defp notify({:ok, %StackRun{} = stack}, :update),
    do: handle_notify(PubSub.StackRunUpdated, stack)
  defp notify({:ok, %StackRun{} = stack}, :delete),
    do: handle_notify(PubSub.StackRunDeleted, stack)
  defp notify({:ok, %StackRun{} = stack}, :complete),
    do: handle_notify(PubSub.StackRunCompleted, stack)

  defp notify(pass, _), do: pass
end
