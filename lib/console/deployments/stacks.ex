defmodule Console.Deployments.Stacks do
  use Console.Services.Base
  import Console.Deployments.Policies
  import Console.Deployments.Stacks.Commands
  alias Console.PubSub
  alias Console.Deployments.Git.Discovery
  alias Console.Deployments.Pr.Dispatcher
  alias Console.Schema.{
    User,
    Cluster,
    Stack,
    StackRun,
    StackState,
    RunStep,
    RunLog,
    GitRepository,
    PullRequest,
    ScmConnection
  }

  @preloads [:environment, :files, :observable_metrics]

  @type error :: Console.error
  @type stack_resp :: {:ok, Stack.t} | error
  @type run_resp :: {:ok, StackRun.t} | error
  @type step_resp :: {:ok, RunStep.t} | error
  @type log_resp :: {:ok, RunLog.t} | error

  @spec get_stack!(binary) :: Stack.t
  def get_stack!(id), do: Repo.get!(Stack, id)

  @spec get_stack_by_name(binary) :: Stack.t | nil
  def get_stack_by_name(name), do: Repo.get_by(Stack, name: name)

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
  Posts a review comment for a completed pr stack run if possible
  """
  def post_comment(%StackRun{} = run) do
    case Repo.preload(run, [:pull_request, :state, stack: :connection]) do
      %StackRun{
        id: id,
        stack_id: stack_id,
        state: %StackState{plan: plan},
        stack: %Stack{connection: %ScmConnection{} = conn},
        pull_request: %PullRequest{} = pr
      } when is_binary(plan) ->
        url = Console.url("/stacks/#{stack_id}/runs/#{id}")
        Dispatcher.review(conn, pr, pr_blob("stack_summary", plan: plan, link: url))
      %StackRun{
        id: id,
        stack_id: stack_id,
        status: :failed,
        stack: %Stack{connection: %ScmConnection{} = conn},
        pull_request: %PullRequest{} = pr
      } ->
        url = Console.url("/stacks/#{stack_id}/runs/#{id}")
        Dispatcher.review(conn, pr, pr_blob("failed", link: url))
      _ -> {:error, "cannot post review for this stack run"}
    end
  end

  defp pr_blob(type, assigns) do
    Path.join([:code.priv_dir(:console), "pr", "#{type}.md.eex"])
    |> EEx.eval_file(assigns: assigns)
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
    |> Stack.complete_changeset(add_stack_state(%{
      status: :successful,
      last_successful: run.git.ref,
      output: Enum.map(output, &Map.take(&1, ~w(name value secret)a))
    }, state))
    |> Repo.update()
  end
  defp sync_stack_status(%StackRun{dry_run: false} = run) do
    get_stack!(run.stack_id)
    |> Stack.complete_changeset(%{status: run.status})
    |> Repo.update()
  end
  defp sync_stack_status(_), do: {:ok, %{}}

  defp add_stack_state(attrs, %{} = state) do
    state = Console.clean(state) |> Map.delete(:run_id)
    Map.put(attrs, :state, state)
  end
  defp add_stack_state(attrs, _), do: attrs

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
    |> notify(:create)
  end

  @poll_preloads ~w(repository environment files)a

  @doc """
  Polls a stack's git repo and creates a run if there's a new commit
  """
  @spec poll(Stack.t | PullRequest.t) :: run_resp
  def poll(%Stack{delete_run_id: id}) when is_binary(id),
    do: {:error, "stack is deleting"}

  def poll(%Stack{sha: sha, git: git} = stack) do
    %{repository: repo} = stack = Repo.preload(stack, @poll_preloads)
    case Discovery.sha(repo, git.ref) do
      {:ok, ^sha} -> {:error, "no new commit in repo"}
      {:ok, new_sha} ->
        with {:ok, new_sha, msg} <- new_changes(repo, git, sha, new_sha),
          do: create_run(stack, new_sha, %{message: msg})
      err -> err
    end
  end

  def poll(%PullRequest{sha: sha, ref: ref, stack_id: id} = pr) when is_binary(id) do
    %{stack: %{repository: repo} = stack} = pr = Repo.preload(pr, [stack: @poll_preloads])
    case Discovery.sha(repo, ref) do
      {:ok, ^sha} -> {:error, "no new commit in repo for branch #{ref}"}
      {:ok, new_sha} ->
        with {:ok, new_sha, msg} <- new_changes(repo, stack.git, sha, new_sha) do
          start_transaction()
          |> add_operation(:run, fn _ ->
            create_run(stack, new_sha, %{pull_request_id: pr.id, message: msg, dry_run: true})
          end)
          |> add_operation(:pr, fn _ ->
            Ecto.Changeset.change(pr, %{ref: new_sha})
            |> Repo.update()
          end)
          |> execute(extract: :run)
        end
      err -> err
    end
  end

  def poll(_), do: {:error, "invalid parent"}

  defp new_changes(repo, %{folder: folder}, sha1, sha2) do
    case Discovery.changes(repo, sha1, sha2, folder) do
      {:ok, _, msg} -> {:ok, sha2, msg}
      _ -> {:error, "no changes within #{folder}"}
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
        |> Map.take(~w(approval dry_run configuration type environment files job_spec repository_id cluster_id)a)
        |> Console.clean()
        |> Map.update(:environment, [], fn env -> Enum.map(env, &Map.delete(&1, :stack_id)) end)
        |> Map.update(:files, [], fn files -> Enum.map(files, &Map.delete(&1, :stack_id)) end)
        |> Map.put(:git, %{ref: sha, folder: stack.git.folder})
        |> Map.put(:steps, commands(stack, !!attrs[:dry_run]))
        |> Map.merge(attrs)
      )
      |> Repo.insert()
    end)
    |> add_operation(:stack, fn %{run: run} ->
      Ecto.Changeset.change(stack, sha_attrs(run, sha))
      |> Stack.delete_changeset(delete_run(stack, run))
      |> Repo.update()
    end)
    |> execute(extract: :run)
    |> notify(:create)
  end

  defp sha_attrs(%StackRun{dry_run: true}, _sha), do: %{}
  defp sha_attrs(%StackRun{}, sha), do: %{sha: sha}

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
    Repo.preload(run, [:errors])
    |> StackRun.update_changeset(%{errors: errors})
    |> Repo.update()
  end

  @doc """
  Determines if the stack or stack pr has a run in progress
  """
  @spec running?(Stack.t | PullRequest.t) :: boolean
  def running?(parent) do
    filter(parent)
    |> StackRun.running()
    |> Repo.exists?()
  end

  defp filter(%Stack{id: id}) do
    StackRun.for_stack(id)
    |> StackRun.wet()
  end

  defp filter(%PullRequest{id: id, stack_id: sid}) do
    StackRun.for_stack(sid)
    |> StackRun.for_pr(id)
    |> StackRun.dry()
  end

  @doc """
  Checks to see if a stack run can be dequeued (all runs before it have terminated), and marks
  it as pending.
  """
  @spec dequeue(Stack.t | PullRequest.t) :: run_resp
  def dequeue(parent) do
    unless running?(parent) do
      filter(parent)
      |> StackRun.for_status(:queued)
      |> StackRun.ordered(asc: :id)
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
  defp notify({:ok, %RunLog{} = log}, :create),
    do: handle_notify(PubSub.RunLogsCreated, log)
  defp notify({:ok, %StackRun{} = stack}, :update),
    do: handle_notify(PubSub.StackRunUpdated, stack)
  defp notify({:ok, %StackRun{} = stack}, :delete),
    do: handle_notify(PubSub.StackRunDeleted, stack)
  defp notify({:ok, %StackRun{} = stack}, :complete),
    do: handle_notify(PubSub.StackRunCompleted, stack)

  defp notify(pass, _), do: pass
end
