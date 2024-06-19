defmodule Console.Deployments.Stacks do
  use Console.Services.Base
  import Console.Deployments.Policies
  import Console.Deployments.Stacks.Commands
  alias Console.PubSub
  alias Console.Deployments.{Services, Clusters, Settings, Git}
  alias Console.Deployments.Git.Discovery
  alias Console.Deployments.Pr.Dispatcher
  alias Kazan.Apis.Batch.V1, as: BatchV1
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
    ScmConnection,
    CustomStackRun
  }

  @preloads [:environment, :files, :observable_metrics]

  @type error :: Console.error
  @type stack_resp :: {:ok, Stack.t} | error
  @type run_resp :: {:ok, StackRun.t} | error
  @type step_resp :: {:ok, RunStep.t} | error
  @type log_resp :: {:ok, RunLog.t} | error
  @type custom_resp :: {:ok, CustomStackRun.t} | error

  @spec get_stack!(binary) :: Stack.t
  def get_stack!(id), do: Repo.get!(Stack, id)

  @spec get_stack_by_name(binary) :: Stack.t | nil
  def get_stack_by_name(name), do: Repo.get_by(Stack, name: name)

  @spec get_run!(binary) :: StackRun.t
  def get_run!(id), do: Repo.get!(StackRun, id)

  @spec get_step!(binary) :: RunStep.t
  def get_step!(id), do: Repo.get!(RunStep, id)

  @spec get_custom_run!(binary) :: CustomStackRun.t | nil
  def get_custom_run!(id), do: Repo.get!(CustomStackRun, id)

  def preloaded(%Stack{} = stack), do: Repo.preload(stack, @preloads)

  @spec authorized(binary, Cluster.t) :: run_resp
  def authorized(run_id, cluster) do
    get_run!(run_id)
    |> allow(cluster, :read)
  end

  @doc """
  If a user has write access to the run, fetches temporary plural creds for use in the given stack run.

  To be set in the environment by the stack harness process
  """
  @spec plural_creds(StackRun.t, User.t | Cluster.t) :: {:ok, %{token: binary, url: binary}}
  def plural_creds(%StackRun{} = run, actor) do
    with {:ok, run} <- allow(run, actor, :state),
      do: plural_creds(run)
  end

  def plural_creds(%StackRun{} = run) do
    case Repo.preload(run, [:actor]) do
      %StackRun{actor: %User{} = actor} ->
        with {:ok, token, _} <- Console.Guardian.encode_and_sign(actor, %{}, ttl: {1, :day}),
          do: {:ok, %{token: token, url: Console.graphql_endpoint()}}
      _ -> {:ok, nil}
    end
  end

  @doc """
  Generates remote state urls for supported tools (only terraform for now)
  """
  @spec state_urls(StackRun.t) :: %{terraform: map}
  def state_urls(%StackRun{stack_id: id}) do
    %{
      terraform: %{
        address: Services.api_url("v1/states/terraform/#{id}"),
        lock: Services.api_url("v1/states/terraform/#{id}/lock"),
        unlock: Services.api_url("v1/states/terraform/#{id}/unlock")
      }
    }
  end

  @doc """
  Creates a new stack if a user can write to its cluster
  """
  @spec create_stack(map, User.t) :: stack_resp
  def create_stack(attrs, %User{} = user) do
    %Stack{status: :queued}
    |> Stack.changeset(Settings.add_project_id(attrs))
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
    |> Stack.update_changeset()
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
  Takes a given stack run, and restarts it if it's considered the latest run
  """
  @spec restart_run(StackRun.t | binary, User.t) :: run_resp
  def restart_run(%StackRun{dry_run: true}, _), do: {:error, "you cannot restart dry runs"}
  def restart_run(%StackRun{git: %{ref: ref}, message: msg} = run, %User{} = user) do
    with {:ok, run} <- allow(run, user, :write) do
      case Repo.preload(run, [:stack]) do
        %{stack: %Stack{sha: ^ref} = stack} ->
          create_run(stack, ref, %{message: msg})
        _ -> {:error, "you can only restart the latest run for this stack"}
      end
    end
  end
  def restart_run(id, %User{} = user) when is_binary(id) do
    get_run!(id)
    |> restart_run(user)
  end

  @doc """
  Posts a review comment for a completed pr stack run if possible
  """
  def post_comment(%StackRun{} = run) do
    run = Repo.preload(run, [:pull_request, :state, stack: :connection])
    case {run, scm_connection(run)}  do
      {%StackRun{
        id: id,
        stack_id: stack_id,
        state: %StackState{plan: plan},
        pull_request: %PullRequest{} = pr
      }, %ScmConnection{} = conn}  when is_binary(plan) ->
        url = Console.url("/stacks/#{stack_id}/runs/#{id}")
        Dispatcher.review(conn, pr, pr_blob("stack_summary", plan: plan, link: url))
      {%StackRun{
        id: id,
        stack_id: stack_id,
        status: :failed,
        pull_request: %PullRequest{} = pr
      }, %ScmConnection{} = conn} ->
        url = Console.url("/stacks/#{stack_id}/runs/#{id}")
        Dispatcher.review(conn, pr, pr_blob("failed", link: url))
      _ -> {:error, "cannot post review for this stack run"}
    end
  end

  defp scm_connection(%StackRun{} = run) do
    case {run, Settings.fetch()} do
      {%StackRun{stack: %{connection: %ScmConnection{} = conn}}, _} -> conn
      {_, %{stacks: %{connection_id: conn_id}}} when is_binary(conn_id) ->
        Git.get_scm_connection(conn_id)
      _ -> nil
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
      |> Repo.preload([:state, :output, :errors])
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

  defp lock(%Stack{id: id}) do
    start_transaction()
    |> add_operation(:fetch, fn _ ->
      Stack.lock()
      |> Repo.get(id)
      |> ok()
    end)
    |> add_operation(:lock, fn
      %{fetch: %Stack{locked_at: l} = s} when not is_nil(l) ->
        Timex.now()
        |> Timex.shift(minutes: -1)
        |> Timex.after?(l)
        |> case do
          true -> {:ok, s}
          _ -> {:error, "stack is locked for update"}
        end
      %{fetch: %Stack{} = s} ->
        Stack.lock_changeset(s, %{locked_at: Timex.now()})
        |> Repo.update()
    end)
    |> execute(extract: :lock)
  end

  defp unlock(%Stack{} = s) do
    Stack.lock_changeset(s, %{locked_at: nil})
    |> Repo.update()
  end

  defp unlock(res, %Stack{} = s) do
    unlock(s)
    res
  end

  @poll_preloads ~w(repository environment files)a

  @doc """
  Polls a stack's git repo and creates a run if there's a new commit
  """
  @spec poll(Stack.t | PullRequest.t) :: run_resp
  def poll(%Stack{delete_run_id: id}) when is_binary(id),
    do: {:error, "stack is deleting"}

  def poll(%Stack{} = stack) do
    with {:ok, %Stack{sha: sha, git: git} = stack} <- lock(stack) do
      %{repository: repo} = stack = Repo.preload(stack, @poll_preloads)
      case Discovery.sha(repo, git.ref) do
        {:ok, ^sha} -> {:error, "no new commit in repo"}
        {:ok, new_sha} ->
          with {:ok, new_sha, msg} <- new_changes(repo, git, sha, new_sha),
            do: create_run(stack, new_sha, %{message: msg})
        err -> err
      end
      |> unlock(stack)
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
            Ecto.Changeset.change(pr, %{sha: new_sha})
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
  Creates an ad-hoc command run w/in the stack's execution context
  """
  @spec create_custom_run(Stack.t, [map], User.t) :: run_resp
  def create_custom_run(%Stack{id: id, sha: sha} = stack, commands, %User{} = user) do
    steps = Enum.with_index(commands, &Map.merge(&1, %{index: &2, stage: :init, status: :pending, name: "cmd #{&2}"}))
    %StackRun{stack_id: id, status: :queued}
    |> StackRun.changeset(
      stack_attrs(stack, sha)
      |> Map.put(:message, "Custom stack run")
      |> Map.put(:steps, steps)
    )
    |> allow(user, :write)
    |> when_ok(:insert)
    |> notify(:create)
  end

  def create_custom_run(stack_id, commands, user) when is_binary(stack_id) do
    get_stack!(stack_id)
    |> create_custom_run(commands, user)
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
        stack_attrs(stack, sha)
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

  defp stack_attrs(%Stack{} = stack, sha) do
    Repo.preload(stack, [:environment, :files])
    |> Map.take(~w(approval actor_id workdir manage_state dry_run configuration type environment files job_spec repository_id cluster_id)a)
    |> Console.clean()
    |> Map.update(:environment, [], fn env -> Enum.map(env, &Map.delete(&1, :stack_id)) end)
    |> Map.update(:files, [], fn files -> Enum.map(files, &Map.delete(&1, :stack_id)) end)
    |> Map.put(:git, %{ref: sha, folder: stack.git.folder})
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

  @doc """
  Ensure the stacks repo has been recently pulled and poll for a new run if so
  """
  @spec kick(binary | Stack.t, User.t) :: stack_resp
  def kick(%Stack{} = stack, %User{} = user) do
    with {:ok, stack} <- allow(stack, user, :write),
         stack <- Repo.preload(stack, [:repository]),
         _ <- Discovery.kick(stack.repository),
      do: poll(stack)
  end

  def kick(id, user) when is_binary(id),
    do: kick(get_stack!(id), user)

  @doc """
  Fetches the k8s job resource from the stack runs configured cluster via KAS
  """
  @spec run_job(StackRun.t) :: {:ok, BatchV1.Job.t} | error
  def run_job(%StackRun{job_ref: %{namespace: ns, name: name}} = run) do
    %{cluster: cluster} = Repo.preload(run, [:cluster])
    BatchV1.read_namespaced_job!(ns, name)
    |> Kazan.run(server: Clusters.control_plane(cluster))
  end
  def run_job(_), do: {:ok, nil}

  @doc """
  Adds a new custom stack run reference to a given stack
  """
  @spec create_custom_stack_run(map, User.t) :: custom_resp
  def create_custom_stack_run(attrs, %User{} = user) do
    %CustomStackRun{}
    |> CustomStackRun.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(&Repo.insert_or_update/1)
  end

  @doc """
  Updates a custom stack run reference
  """
  @spec update_custom_stack_run(map, binary, User.t) :: custom_resp
  def update_custom_stack_run(attrs, id, %User{} = user) do
    Repo.get!(CustomStackRun, id)
    |> CustomStackRun.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(:update)
  end

  @doc """
  Deletes a custom stack run entity
  """
  @spec delete_custom_stack_run(binary, User.t) :: custom_resp
  def delete_custom_stack_run(id, %User{} = user) do
    Repo.get!(CustomStackRun, id)
    |> allow(user, :write)
    |> when_ok(:delete)
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
