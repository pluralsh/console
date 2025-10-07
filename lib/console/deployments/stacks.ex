defmodule Console.Deployments.Stacks do
  use Console.Services.Base
  import Console.Deployments.Pr.Utils, only: [render_solid_raw: 2]
  import Console.Deployments.Policies
  import Console.Deployments.Stacks.Commands
  alias Console.PubSub
  alias Console.Deployments.{Services, Clusters, Settings, Git, Stacks.Stability, Tar}
  alias Console.Deployments.Git.Discovery
  alias Console.Deployments.Pr.Dispatcher
  alias Console.Services.Users
  alias Console.AI.{Provider, Tools.ApproveStack}
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
    CustomStackRun,
    StackDefinition,
    StackCron,
    AiInsight
  }

  @preloads [:environment, :files, :observable_metrics, :cron, :tags, :read_bindings, :write_bindings]

  @type error :: Console.error
  @type stack_resp :: {:ok, Stack.t} | error
  @type run_resp :: {:ok, StackRun.t} | error
  @type step_resp :: {:ok, RunStep.t} | error
  @type log_resp :: {:ok, RunLog.t} | error
  @type custom_resp :: {:ok, CustomStackRun.t} | error
  @type def_resp :: {:ok, StackDefinition.t} | error

  def count(), do: Repo.aggregate(Stack, :count)

  @spec get_stack!(binary) :: Stack.t
  def get_stack!(id), do: Repo.get!(Stack, id)

  @spec get_stack(binary) :: Stack.t
  def get_stack(id), do: Repo.get!(Stack, id)

  @spec get_stack_by_name(binary) :: Stack.t | nil
  def get_stack_by_name(name), do: Repo.get_by(Stack, name: name)

  @spec get_stack_by_name!(binary) :: Stack.t | nil
  def get_stack_by_name!(name), do: Repo.get_by!(Stack, name: name)

  @spec get_run!(binary) :: StackRun.t
  def get_run!(id), do: Repo.get!(StackRun, id)

  @spec get_run(binary) :: StackRun.t | nil
  def get_run(id), do: Repo.get(StackRun, id)

  @spec get_step!(binary) :: RunStep.t
  def get_step!(id), do: Repo.get!(RunStep, id)

  @spec get_custom_run!(binary) :: CustomStackRun.t | nil
  def get_custom_run!(id), do: Repo.get!(CustomStackRun, id)

  @spec get_definition!(binary) :: StackDefinition.t
  def get_definition!(id), do: Repo.get!(StackDefinition, id)

  @spec latest_run(binary) :: StackRun.t | nil
  def latest_run(stack_id) do
    StackRun.for_stack(stack_id)
    |> StackRun.ordered(desc: :id)
    |> StackRun.limit(1)
    |> Repo.one()
  end

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
    with {:actor, %StackRun{actor: %User{} = actor}} <- {:actor, Repo.preload(run, [:actor])},
         {:ok, token, _} <- Console.Guardian.encode_and_sign(actor, %{run_id: run.id}, ttl: {1, :day}) do
      {:ok, %{token: token, url: Console.graphql_endpoint()}}
    else
      {:actor, _} -> {:ok, nil}
      err -> err
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
    |> allow(user, :create)
    |> when_ok(:insert)
    |> notify(:create, user)
  end

  @doc """
  Updates an existing stack and creates a new run if a runnable change occurred
  """
  @spec update_stack(map, binary, User.t) :: stack_resp
  def update_stack(attrs, id, %User{} = user) do
    start_transaction()
    |> add_operation(:stack, fn _ ->
      get_stack!(id)
      |> preloaded()
      |> allow(user, :write)
      |> when_ok(fn s ->
        Stack.changeset(s, Stability.stabilize(attrs, s))
        |> Stack.update_changeset()
      end)
      |> when_ok(:update)
    end)
    |> add_operation(:run, fn
      %{stack: %Stack{runnable: true} = stack} ->
        trigger_run(stack.id, user)
      _ -> {:ok, nil}
    end)
    |> execute(extract: :stack)
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
  Reverts the deleted_at state of a stack
  """
  @spec restore_stack(binary, User.t) :: stack_resp
  def restore_stack(id, %User{} = user) do
    start_transaction()
    |> add_operation(:fetch, fn _ ->
      get_stack!(id)
      |> allow(user, :write)
    end)
    |> add_operation(:run, fn
      %{fetch: %Stack{delete_run_id: id}} when is_binary(id) ->
        get_run!(id)
        |> StackRun.changeset(%{status: :cancelled})
        |> Repo.update()
      _ -> {:ok, nil}
    end)
    |> add_operation(:update, fn %{fetch: %Stack{} = stack} ->
      stack
      |> Stack.delete_changeset(%{deleted_at: nil, delete_run_id: nil})
      |> allow(user, :write)
      |> when_ok(:update)
    end)
    |> execute(extract: :update)
  end

  @doc """
  creates a new stack definition
  """
  @spec create_stack_definition(map, User.t) :: def_resp
  def create_stack_definition(attrs, %User{} = user) do
    %StackDefinition{}
    |> StackDefinition.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(:insert)
  end

  @doc """
  updates a stack definition
  """
  @spec update_stack_definition(map, binary, User.t) :: def_resp
  def update_stack_definition(attrs, id, %User{} = user) do
    start_transaction()
    |> add_operation(:auth, fn _ ->
      get_definition!(id)
      |> allow(user, :write)
    end)
    |> add_operation(:update, fn %{auth: auth} ->
      auth
      |> StackDefinition.changeset(attrs)
      |> allow(user, :write)
      |> when_ok(:update)
    end)
    |> execute(extract: :update)
  end

  @doc """
  deletes a stack definition
  """
  @spec delete_stack_definition(binary, User.t) :: def_resp
  def delete_stack_definition(id, %User{} = user) do
    get_definition!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
  end

  @doc """
  modifies rbac settings for this stack
  """
  @spec rbac(map, binary, User.t) :: stack_resp
  def rbac(attrs, stack_id, %User{} = user) do
    get_stack!(stack_id)
    |> Repo.preload([:read_bindings, :write_bindings])
    |> allow(user, :write)
    |> when_ok(&Stack.rbac_changeset(&1, attrs))
    |> when_ok(:update)
    |> notify(:update, user)
  end

  @doc """
  Updates basic attributes of a run, clusters and users are authorized to perform
  """
  @spec update_stack_run(map, binary, User.t | Cluster.t) :: run_resp
  def update_stack_run(attrs, id, actor) do
    start_transaction()
    |> add_operation(:run, fn _ ->
      get_run!(id)
      |> Repo.preload([:state, violations: :causes])
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
  def restart_run(%StackRun{git: %{ref: ref}, message: msg, pull_request_id: nil} = run, %User{} = user) do
    with {:ok, run} <- allow(run, user, :write) do
      case Repo.preload(run, [:stack]) do
        %{stack: %Stack{sha: ^ref} = stack} ->
          create_run(stack, ref, %{message: msg})
        _ -> {:error, "you can only restart the latest run for this stack"}
      end
    end
  end
  def restart_run(%StackRun{}, _),
    do: {:error, "you cannot restart a run that is not associated with a pull request"}
  def restart_run(id, %User{} = user) when is_binary(id) do
    get_run!(id)
    |> restart_run(user)
  end

  @doc """
  Posts a review comment for a completed pr stack run if possible
  """
  def post_comment(%StackRun{} = run) do
    run = Repo.preload(run, [:pull_request, stack: :connection, state: :insight])
    case {run, scm_connection(run)}  do
      {%StackRun{
        id: id,
        stack_id: stack_id,
        status: :successful,
        state: %StackState{insight: %AiInsight{} = insight},
        pull_request: %PullRequest{} = pr
      }, %ScmConnection{} = conn} ->
        url = Console.url("/stacks/#{stack_id}/runs/#{id}")
        Dispatcher.review(conn, pr, pr_blob("insight", insight: insight, link: url))
      {%StackRun{
        id: id,
        stack_id: stack_id,
        status: status,
        state: %StackState{plan: plan},
        pull_request: %PullRequest{} = pr
      }, %ScmConnection{} = conn}  when is_binary(plan) and status in ~w(pending_approval successful)a ->
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
      {%StackRun{
        id: id,
        stack_id: stack_id,
        status: :successful,
        pull_request: %PullRequest{} = pr
      }, %ScmConnection{} = conn} ->
        url = Console.url("/stacks/#{stack_id}/runs/#{id}")
        Dispatcher.review(conn, pr, pr_blob("succeeded", link: url))
      _ -> {:error, "cannot post review for this stack run"}
    end
  end

  @doc """
  Updates the commit status for a given stack run
  """
  @spec commit_status(StackRun.t) :: :ok | Console.error
  def commit_status(%StackRun{git: %{ref: ref}, type: type} = run) do
    start_transaction()
    |> add_operation(:run, fn _ -> {:ok, Repo.locked(run)} end)
    |> add_operation(:persist, fn %{run: run} ->
      case {Repo.preload(run, [:pull_request]), scm_connection(run)} do
        {%StackRun{pull_request: %PullRequest{} = pr, check_id: check_id}, %ScmConnection{} = conn} ->
          status = _commit_status(run)
          Dispatcher.commit_status(conn, pr, check_id, status, %{
            url: Console.url("/stacks/#{run.stack_id}/runs/#{run.id}"),
            sha: ref,
            name: "Plural: #{type} plan",
            description: "Plan Status: #{status}",
            summary: "View full details here: #{Console.url("/stacks/#{run.stack_id}/runs/#{run.id}")}",
          })
          |> maybe_persist(run)
        _ -> {:ok, %{}}
      end
    end)
    |> execute(extract: :persist)
  end

  defp maybe_persist({:ok, id}, %StackRun{} = run) when is_binary(id) do
    StackRun.changeset(run, %{check_id: id})
    |> Repo.update()
  end
  defp maybe_persist(err, _), do: err

  defp _commit_status(%StackRun{dry_run: true, status: :pending_approval}), do: :successful
  defp _commit_status(%StackRun{status: status}), do: status

  defp scm_connection(%StackRun{} = run) do
    case {run, Settings.fetch()} do
      {%StackRun{stack: %{connection: %ScmConnection{} = conn}}, _} -> conn
      {_, %{stacks: %{connection_id: conn_id}}} when is_binary(conn_id) ->
        Git.get_scm_connection(conn_id)
      _ -> Git.default_scm_connection()
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
      |> Repo.preload([:state, :output, :errors, :stack, violations: :causes])
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
    state =
      Console.clean(state)
      |> Map.drop(~w(run_id insight)a)
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
  Determines if a stack run should be approved based on a specified rules file.  Only available for terraform stacks and leverages
  the approve_stack tool call.
  """
  @spec ai_stack_run_approval(StackRun.t) :: run_resp | :ok
  def ai_stack_run_approval(%StackRun{
    type: :terraform,
    status: :pending_approval,
    approver_id: nil,
    configuration: %Stack.Configuration{
      ai_approval: %Stack.Configuration.AiApproval{
        enabled: true, git: git, file: file
      }
    }
  } = run) do
    with %{repository: %GitRepository{} = repo, state: %StackState{plan: p}} = run = Repo.preload(run, [:repository, :state]),
         {:ok, f} <- Discovery.fetch(repo, git),
         {:ok, files} <- Tar.tar_stream(f),
         {_, rules} <- Enum.find(files, fn {k, _} -> k == file end) do
      [
        {:user, "I've been given the following terraform plan, determine if its safe to merge given the various rules provided"},
        {:user, "here is the terraform plan:"},
        {:user, "```terraform\n#{p}\n```"},
        {:user, "Here are the rules for approval:\n\n#{rules}"}
      ]
      |> Provider.simple_tool_call(ApproveStack)
      |> case do
        {:ok, %ApproveStack{} = approval} -> handle_approval(run, approval)
        err -> err
      end
    end
  end
  def ai_stack_run_approval(_), do: :ok

  defp handle_approval(%StackRun{} = run, %ApproveStack{} = approval) do
    StackRun.update_changeset(run, %{approval_result: Map.take(approval, ~w(reason result)a)})
    |> approval_decision(run, approval)
    |> Repo.update()
    |> case do
      {:ok, %StackRun{status: s, approver_id: id} = run} when s == :cancelled or is_binary(id) ->
        handle_notify(PubSub.StackRunUpdated, run)
      res -> res
    end
  end

  defp approval_decision(
    cs,
    %StackRun{configuration: %{ai_approval: %{ignore_cancel: true}}},
    %ApproveStack{result: :rejected}
  ), do: cs
  defp approval_decision(cs, _, %ApproveStack{result: :approved}) do
    bot = %{Users.get_bot!("console") | roles: %{admin: true}}
    StackRun.approve_changeset(cs, %{approver_id: bot.id, approved_at: Timex.now()})
  end
  defp approval_decision(cs, _, %ApproveStack{result: :rejected}),
    do: StackRun.update_changeset(cs, %{status: :cancelled})
  defp approval_decision(cs, _, _), do: cs

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
    |> Stack.next_poll_changeset(s.interval)
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

  def poll(%Stack{polled_sha: ps} = stack) do
    with {:ok, %Stack{sha: sha, git: git} = stack} <- lock(stack) do
      %{repository: repo} = stack = Repo.preload(stack, @poll_preloads)
      on_new_sha(repo, git.ref, sha, ps, fn new_sha ->
        case new_changes(repo, git, sha, new_sha) do
          {:ok, new_sha, msg} ->
           create_run(stack, new_sha, %{message: msg})
          err ->
            add_polled_sha(stack, new_sha)
            err
        end
      end)
      |> unlock(stack)
    end
  end

  def poll(%PullRequest{sha: sha, polled_sha: ps, ref: ref, stack_id: id} = pr) when is_binary(id) do
    %{stack: %{repository: repo} = stack} = pr = Repo.preload(pr, [stack: @poll_preloads])
    on_new_sha(repo, ref, sha, ps, fn new_sha ->
      case new_changes(repo, stack.git, sha, new_sha) do
        {:ok, new_sha, msg} ->
          start_transaction()
          |> add_operation(:run, fn _ ->
            create_run(stack, new_sha, %{pull_request_id: pr.id, message: msg, dry_run: true})
          end)
          |> add_operation(:pr, fn _ ->
            Ecto.Changeset.change(pr, %{sha: new_sha})
            |> PullRequest.next_poll_changeset(stack.interval)
            |> Repo.update()
          end)
          |> execute(extract: :run)
        err ->
          PullRequest.next_poll_changeset(pr, stack.interval)
          |> add_polled_sha(new_sha)
          err
      end
    end)
  end

  def poll(_), do: {:error, "invalid parent"}

  defp on_new_sha(repo, ref, sha, ps, fun) do
    case Discovery.sha(repo, ref) do
      {:ok, ^ps} -> {:error, "this sha has already been polled"}
      {:ok, ^sha} -> {:error, "no new commit in repo for branch #{ref}"}
      {:ok, found} -> fun.(found)
      err -> err
    end
  end

  defp add_polled_sha(record, sha) do
    Ecto.Changeset.change(record, %{polled_sha: sha})
    |> Repo.update()
  end

  defp new_changes(repo, %{folder: folder}, sha1, sha2) do
    case Discovery.changes(repo, sha1, sha2, folder) do
      {:ok, [_ | _], msg} -> {:ok, sha2, msg}
      {:ok, :pass, msg} -> {:ok, sha2, msg}
      _ -> {:error, "no changes within #{folder}"}
    end
  end

  @doc """
  Spawns a new run in response to a stack cron being executable
  """
  @spec spawn_cron(StackCron.t) :: run_resp
  def spawn_cron(%StackCron{auto_approve: approve} = cron) do
    %{stack: stack} = Repo.preload(cron, [stack: @poll_preloads])
    start_transaction()
    |> add_operation(:run, fn _ ->
      create_run(stack, stack.sha, maybe_merge_overrides(%{
        message: "cron run for #{stack.name}",
        approval: stack.approval || approve
      }, cron))
    end)
    |> add_operation(:cron, fn _ ->
      StackCron.changeset(cron, %{last_run_at: Timex.now()})
      |> Repo.update()
    end)
    |> execute(extract: :run)
  end

  defp maybe_merge_overrides(attrs, %StackCron{overrides: %StackCron.ConfigurationOverrides{} = overrides}) do
    Map.put(attrs, :configuration, Console.mapify(overrides))
  end
  defp maybe_merge_overrides(attrs, _), do: attrs

  @doc """
  Creates an ad-hoc command run w/in the stack's execution context
  """
  @spec create_custom_run(Stack.t, [map], map | nil, User.t) :: run_resp
  def create_custom_run(stack, commands, ctx \\ nil, user)
  def create_custom_run(%Stack{id: id, sha: sha} = stack, commands, ctx, %User{} = user) do
    steps =
      Enum.with_index(commands, &Map.merge(&1, %{index: &2, stage: :init, status: :pending, name: "cmd #{&2}"}))
      |> template_cmds(ctx)
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
  def create_custom_run(stack_id, commands, ctx, user) when is_binary(stack_id) do
    get_stack!(stack_id)
    |> create_custom_run(commands, ctx, user)
  end

  defp template_cmds(commands, ctx) when is_map(ctx) do
    Enum.map(commands, fn %{args: args} = cmd ->
      args = Enum.map(args, fn arg ->
        case render_solid_raw(arg, ctx) do
          {:ok, arg} -> arg
          {:error, err} ->
            raise Console.InternalException, message: "Failed to template #{arg}, error: #{err}"
        end
      end)
      Map.put(cmd, :args, args)
    end)
  end
  defp template_cmds(commands, _), do: commands

  @doc """
  Creates a fresh run from the last sha of the stack
  """
  @spec trigger_run(binary, User.t) :: run_resp
  def trigger_run(stack_id, %User{} = user) do
    start_transaction()
    |> add_operation(:stack, fn _ ->
      get_stack!(stack_id)
      |> allow(user, :write)
    end)
    |> add_operation(:run, fn %{stack: stack} ->
      case latest_run(stack.id) do
        %StackRun{git: %{ref: sha}, message: msg} ->
          create_run(stack, sha, %{message: msg})
        _ -> poll(stack)
      end
    end)
    |> execute(extract: :run)
  end

  @doc """
  Creates a new run for the stack with the given sha and optional additional attrs
  """
  @spec create_run(Stack.t, binary) :: run_resp
  def create_run(%Stack{} = stack, sha, attrs \\ %{}) do
    stack = Repo.preload(stack, [:definition])
    start_transaction()
    |> add_operation(:run, fn _ ->
      %StackRun{stack_id: stack.id, status: :queued}
      |> StackRun.changeset(
        stack_attrs(stack, sha)
        |> Map.put(:steps, commands(stack, !!attrs[:dry_run]))
        |> DeepMerge.deep_merge(attrs)
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

  @run_attrs ~w(approval variables actor_id workdir manage_state dry_run configuration type environment files job_spec policy_engine repository_id cluster_id)a

  defp stack_attrs(%Stack{} = stack, sha) do
    Repo.preload(stack, [:environment, :files])
    |> Map.take(@run_attrs)
    |> Map.put(:configuration, ensure_configuration(stack))
    |> Console.clean()
    |> Map.update(:environment, [], fn env -> Enum.map(env, &Map.delete(&1, :stack_id)) end)
    |> Map.update(:files, [], fn files -> Enum.map(files, &Map.delete(&1, :stack_id)) end)
    |> Map.put(:git, %{ref: sha, folder: stack.git.folder})
  end

  defp ensure_configuration(
    %Stack{
      definition: %StackDefinition{configuration: %Stack.Configuration{} = def_conf},
      configuration: conf
    }
  ) do
    (conf || %{})
    |> Map.put_new(:image, def_conf.image)
    |> Map.put_new(:tag, def_conf.tag)
  end
  defp ensure_configuration(%Stack{configuration: configuration}), do: configuration

  defp sha_attrs(%StackRun{dry_run: true}, _sha), do: %{}
  defp sha_attrs(%StackRun{}, sha), do: %{sha: sha}

  defp delete_run(%Stack{deleted_at: d}, %{id: id}) when not is_nil(d),
    do: %{delete_run_id: id}
  defp delete_run(_, _), do: %{}

  @doc """
  Fetches a file handle to the tarball for a stack run
  """
  @spec digest(StackRun.t) :: {:ok, binary} | error
  def digest(%StackRun{} = run) do
    case Repo.preload(run, [:repository]) do
      %{repository: %GitRepository{} = repo, git: git} -> Discovery.digest(repo, git)
      _ -> {:error, "could not resolve repository for run"}
    end
  end

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

  defp filter(%Stack{id: id}), do: StackRun.for_stack(id)
  defp filter(%PullRequest{stack_id: sid}), do: StackRun.for_stack(sid)

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
  @spec kick(binary | Stack.t | PullRequest.t, User.t) :: stack_resp
  def kick(%Stack{} = stack, %User{} = user) do
    with {:ok, stack} <- allow(stack, user, :write),
         stack <- Repo.preload(stack, [:repository]),
         _ <- Discovery.kick(stack.repository),
      do: poll(stack)
  end

  def kick(%PullRequest{} = pr, %User{} = user) do
    with %PullRequest{stack: %Stack{} = s} = pr <- Repo.preload(pr, [stack: :repository]),
         {:ok, stack} <- allow(s, user, :write),
         _ <- Discovery.kick(stack.repository) do
      poll(pr)
    else
      %PullRequest{} -> {:error, "pull request is not attached to a stack"}
      err -> err
    end
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
    do: notify_after(:timer.seconds(5), PubSub.StackRunCreated, stack)
  defp notify({:ok, %RunLog{} = log}, :create),
    do: handle_notify(PubSub.RunLogsCreated, log)
  defp notify({:ok, %StackRun{} = stack}, :update),
    do: handle_notify(PubSub.StackRunUpdated, stack)
  defp notify({:ok, %StackRun{} = stack}, :complete),
    do: handle_notify(PubSub.StackRunCompleted, stack)

  defp notify(pass, _), do: pass
end
