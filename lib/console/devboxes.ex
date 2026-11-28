defmodule Console.Devboxes do
  @moduledoc """
  DevBoxes: operator-registered boxes (`DevboxRunner`s), the instances workbenches start from them, their snapshots
  and keep-awake leases.  Threads live in `Console.Devboxes.Threads` and everything the gateway reports in
  `Console.Devboxes.Ingest`.  Every cluster call goes through `Console.Devboxes.Control`.
  """
  use Console.Services.Base
  import Console.Deployments.Policies
  require Logger
  alias Console.PubSub
  alias Console.Deployments.{Clusters, Git, Workbenches}
  alias Console.Devboxes.{Billing, Control, Credentials, Error, Names, ProxyModels}
  alias Console.WorkloadIdentity
  alias Console.Services.Users
  alias Console.WorkloadIdentity.Scopes.Devboxes, as: DevboxScope
  alias Console.Schema.{
    Cluster,
    Devbox,
    DevboxInstance,
    DevboxSnapshot,
    ScmConnection,
    User,
    Workbench,
    WorkbenchDevbox
  }

  @type error :: Console.error
  @type devbox_resp :: {:ok, Devbox.t} | error
  @type instance_resp :: {:ok, DevboxInstance.t} | error
  @type snapshot_resp :: {:ok, DevboxSnapshot.t} | error

  @viewer_ttl 90
  @lease_resync 45

  def get_devbox!(id), do: Repo.get!(Devbox, id)
  def get_devbox(id), do: Repo.get(Devbox, id)
  def get_devbox_by_name(cluster_id, name), do: Repo.get_by(Devbox, cluster_id: cluster_id, name: name)

  def get_instance!(id), do: Repo.get!(DevboxInstance, id)
  def get_instance(id), do: Repo.get(DevboxInstance, id)

  def get_snapshot!(id), do: Repo.get!(DevboxSnapshot, id)

  @doc """
  Fetches a devbox for an operator or a user with global settings access.
  """
  @spec fetch_devbox(binary, User.t | Cluster.t) :: devbox_resp
  def fetch_devbox(id, actor), do: get_devbox!(id) |> allow(actor, :read)

  @doc """
  Upserts a devbox, keyed by name and cluster.  Performed by the deployment operator reconciling a `DevboxRunner`,
  with its probed agent catalog.  `scm_connections` names the scm connections the box may use.  `create_bindings`
  is the runner's full binding list, so omitting it clears them and falls back to the global create policy.
  """
  @spec upsert_devbox(map, Cluster.t, User.t | Cluster.t) :: devbox_resp
  def upsert_devbox(attrs, cluster, actor \\ nil)
  def upsert_devbox(%{name: name} = attrs, %Cluster{id: cid} = cluster, actor) do
    devbox = get_devbox_by_name(cid, name) |> Repo.preload([:scm_connection_associations, :create_bindings])

    with {:ok, _} <- allow(devbox || %Devbox{cluster_id: cid}, actor || cluster, :write),
         :ok <- Clusters.agents_allowed(cid),
         {:ok, attrs} <- resolve_scm_connections(attrs, devbox) do
      attrs = stabilize_bindings(Map.put_new(attrs, :create_bindings, []), devbox)
      start_transaction()
      |> add_operation(:devbox, fn _ ->
        (devbox || %Devbox{cluster_id: cid})
        |> Devbox.changeset(attrs)
        |> Repo.insert_or_update()
      end)
      |> add_operation(:issuer, fn %{devbox: devbox} -> WorkloadIdentity.ensure_issuer(DevboxScope.type(), devbox.id) end)
      |> execute(extract: :devbox)
    end
  end
  def upsert_devbox(_, _, _), do: {:error, "name is required"}

  defp resolve_scm_connections(%{scm_connections: [_ | _] = names} = attrs, devbox) do
    existing = Map.new((devbox && devbox.scm_connection_associations) || [], & {&1.connection_id, &1.id})
    Enum.reduce_while(names, {:ok, []}, fn name, {:ok, acc} ->
      case Git.get_scm_connection_by_name(name) do
        %ScmConnection{id: id} -> {:cont, {:ok, [%{connection_id: id, id: existing[id]} | acc]}}
        nil -> {:halt, {:error, "could not find scm connection #{name}"}}
      end
    end)
    |> when_ok(fn assocs ->
      Map.delete(attrs, :scm_connections)
      |> Map.put(:scm_connection_associations, Enum.reverse(assocs))
    end)
  end
  defp resolve_scm_connections(%{scm_connections: []} = attrs, _),
    do: {:ok, Map.delete(attrs, :scm_connections) |> Map.put(:scm_connection_associations, [])}
  defp resolve_scm_connections(attrs, _), do: {:ok, attrs}

  defp stabilize_bindings(%{create_bindings: bindings} = attrs, devbox) when is_list(bindings),
    do: Map.put(attrs, :create_bindings, Users.stabilize_bindings(bindings, devbox && devbox.create_bindings))
  defp stabilize_bindings(attrs, _), do: attrs

  @doc """
  Records an operator heartbeat for a box: status, conditions and the resolved image digest and template revision.
  """
  @spec heartbeat_devbox(map, binary, Cluster.t) :: devbox_resp
  def heartbeat_devbox(attrs, id, %Cluster{} = cluster) do
    get_devbox!(id)
    |> allow(cluster, :write)
    |> when_ok(fn devbox ->
      devbox
      |> Devbox.heartbeat_changeset(Map.put(attrs, :last_heartbeat_at, DateTime.utc_now()))
      |> Repo.update()
    end)
  end

  @doc """
  Deletes a box.  Fails while snapshots of it exist (they are workbench-owned and must be deleted first).
  """
  @spec delete_devbox(binary, Cluster.t | User.t) :: devbox_resp
  def delete_devbox(id, actor) do
    start_transaction()
    |> add_operation(:devbox, fn _ -> allow(get_devbox!(id), actor, :delete) end)
    |> add_operation(:delete, fn %{devbox: devbox} ->
      devbox
      |> Devbox.changeset()
      |> Repo.delete()
    end)
    |> add_operation(:issuer, fn %{devbox: devbox} -> WorkloadIdentity.disable_issuer(DevboxScope.type(), devbox.id) end)
    |> execute(extract: :delete)
  end

  @doc """
  Mints a short-lived probe token for a box's catalog probe.
  """
  @spec mint_probe_token(binary, Cluster.t) :: {:ok, binary, DateTime.t} | error
  def mint_probe_token(id, %Cluster{} = cluster) do
    with {:ok, devbox} <- allow(get_devbox!(id), cluster, :write),
      do: Credentials.mint_probe_token(devbox)
  end

  @doc """
  Attaches a box to a workbench, requires write access to the workbench and create access to the box.
  """
  @spec attach_devbox(binary, binary, User.t) :: {:ok, WorkbenchDevbox.t} | error
  def attach_devbox(workbench_id, devbox_id, %User{} = user) do
    with {:ok, _} <- allow(get_devbox!(devbox_id), user, :create) do
      %WorkbenchDevbox{}
      |> WorkbenchDevbox.changeset(%{workbench_id: workbench_id, devbox_id: devbox_id})
      |> allow(user, :write)
      |> when_ok(:insert)
    end
  end

  @doc """
  Detaches a box from a workbench.  Running instances keep running.
  """
  @spec detach_devbox(binary, binary, User.t) :: {:ok, WorkbenchDevbox.t} | error
  def detach_devbox(workbench_id, devbox_id, %User{} = user) do
    case Repo.get_by(WorkbenchDevbox, workbench_id: workbench_id, devbox_id: devbox_id) do
      %WorkbenchDevbox{} = wd ->
        allow(wd, user, :write)
        |> when_ok(:delete)
      nil -> {:error, "this devbox is not attached to the workbench"}
    end
  end

  @doc """
  Fetches an instance, requires read access to its workbench.
  """
  @spec fetch_instance(binary, User.t | Cluster.t) :: instance_resp
  def fetch_instance(id, actor), do: get_instance!(id) |> allow(actor, :read)

  @doc """
  Starts an instance of an attached box (or restores one from a snapshot), requiring create access to the box.
  Validates the agent, model, config options and repositories against the box's catalog and allowlist, and the
  box's `maxInstances`.
  """
  @spec create_instance(map, binary, User.t) :: instance_resp
  def create_instance(attrs, workbench_id, %User{id: user_id} = user) do
    start_transaction()
    |> add_operation(:workbench, fn _ ->
      Workbenches.get_workbench!(workbench_id)
      |> allow(user, :read)
    end)
    |> add_operation(:snapshot, fn _ -> instance_snapshot(attrs[:snapshot_id], workbench_id) end)
    |> add_operation(:devbox, fn %{snapshot: snapshot} ->
      attached_devbox(workbench_id, attrs[:devbox_id] || (snapshot && snapshot.devbox_id))
    end)
    |> add_operation(:access, fn %{devbox: devbox} -> allow(devbox, user, :create) end)
    |> add_operation(:capacity, fn %{devbox: devbox} -> check_capacity(devbox) end)
    |> add_operation(:billing, fn %{devbox: devbox, workbench: wb} -> Billing.resolve(devbox, wb, user, attrs[:agent_billing]) end)
    |> add_operation(:catalog, fn %{devbox: devbox, billing: billing} -> resolve_catalog(devbox, attrs, billing) end)
    |> add_operation(:repositories, fn %{devbox: devbox, workbench: wb} ->
      resolve_repositories(devbox, wb, attrs[:repositories])
    end)
    |> add_operation(:autonomy, fn %{catalog: catalog, billing: billing} ->
      check_proxy_auto(%DevboxInstance{agent_billing: billing}, catalog.agent, catalog.config_options)
    end)
    |> add_operation(:instance, fn %{devbox: devbox, snapshot: snapshot, catalog: catalog, repositories: repos, billing: billing} ->
      %DevboxInstance{workbench_id: workbench_id, devbox_id: devbox.id, user_id: user_id}
      |> DevboxInstance.changeset(%{
        name: instance_name(attrs[:name], workbench_id),
        agent: catalog.agent,
        requested_model: catalog.model,
        config_options: catalog.config_options,
        repositories: repos,
        agent_billing: billing,
        max_running_threads: attrs[:max_running_threads],
        status: :pending,
        snapshot_id: snapshot && snapshot.id,
        restore_fidelity: restore_fidelity(snapshot, devbox),
        template_revision: devbox.template_revision,
        image_digest: devbox.resolved_image
      } |> Console.drop_nils())
      |> allow(user, :create)
      |> when_ok(:insert)
    end)
    |> execute()
    |> case do
      {:ok, %{instance: inst} = res} ->
        notify({:ok, inst}, :create)
        start_instance(inst, res)
      err -> err
    end
  end

  # The gateway reports on (and garbage-collects) an instance as soon as it hears of it, so it may only hear of
  # committed ones: an instance invisible to ingest is "unknown" and gets its actor deleted.
  defp start_instance(%DevboxInstance{} = inst, %{snapshot: snapshot, devbox: devbox, workbench: wb}) do
    Control.create_instance(inst, %{snapshot: snapshot, devbox: devbox, idle_policy: idle_policy(devbox, wb)})
    |> control_result(inst)
    |> case do
      {:ok, inst} -> {:ok, inst}
      err ->
        fail_start(inst, "could not start on the cluster: #{error_message(err)}", ~w(pending provisioning)a)
        err
    end
  end

  defp fail_start(%DevboxInstance{id: id}, reason, statuses) do
    start_transaction()
    |> add_operation(:instance, fn _ -> DevboxInstance.with_lock() |> Repo.get!(id) |> ensure_status(statuses) end)
    |> add_operation(:update, fn %{instance: inst} -> end_instance(inst, :failed, reason) end)
    |> execute(extract: :update)
    |> notify(:end)
  end

  defp error_message({:error, %{message: msg}}) when is_binary(msg), do: msg
  defp error_message({:error, msg}) when is_binary(msg), do: msg
  defp error_message(err), do: inspect(err)

  defp instance_name(name, _) when is_binary(name) and byte_size(name) > 0, do: name
  defp instance_name(_, workbench_id) do
    DevboxInstance.for_workbench(workbench_id)
    |> DevboxInstance.live()
    |> DevboxInstance.names()
    |> Repo.all()
    |> Names.generate()
  end

  defp instance_snapshot(nil, _), do: {:ok, nil}
  defp instance_snapshot(id, workbench_id) do
    case get_snapshot!(id) do
      %DevboxSnapshot{workbench_id: ^workbench_id, status: :ready} = snapshot -> {:ok, snapshot}
      %DevboxSnapshot{workbench_id: ^workbench_id} -> {:error, "only ready snapshots can be restored"}
      _ -> {:error, "snapshot does not belong to this workbench"}
    end
  end

  defp attached_devbox(_, nil), do: {:error, "a devbox is required to start an instance"}
  defp attached_devbox(workbench_id, devbox_id) do
    with %WorkbenchDevbox{} <- Repo.get_by(WorkbenchDevbox, workbench_id: workbench_id, devbox_id: devbox_id),
         %Devbox{} = devbox <- Repo.get(Devbox.with_lock(), devbox_id) do
      {:ok, devbox}
    else
      _ -> {:error, "this devbox is not attached to the workbench"}
    end
  end

  defp check_capacity(%Devbox{max_instances: max} = devbox) when is_integer(max) do
    DevboxInstance.for_devbox(devbox.id)
    |> DevboxInstance.live()
    |> Repo.aggregate(:count)
    |> case do
      count when count < max -> {:ok, count}
      _ -> {:error, "devbox #{devbox.name} is at its limit of #{max} running instances"}
    end
  end
  defp check_capacity(_), do: {:ok, 0}

  @doc """
  Validates an agent, model and config options against a box's catalog, filling in the defaults.  The model is
  checked against what the agent offers under its billing in `agent_billing` (the AI proxy when unlisted).
  """
  @spec resolve_catalog(Devbox.t, map, map | nil) :: {:ok, %{agent: atom, model: binary | nil, config_options: map}} | error
  def resolve_catalog(%Devbox{} = devbox, attrs, agent_billing \\ nil) do
    with %Devbox.Agent{} = agent <- Devbox.agent(devbox, attrs[:agent]),
         billing = Billing.for_agent(%DevboxInstance{agent_billing: agent_billing}, agent.type).billing,
         {:ok, model} <- resolve_model(agent, attrs[:model], billing),
         {:ok, opts} <- resolve_config_options(agent.config_options, attrs[:config_options]),
         {:ok, opts} <- check_autonomy(devbox, opts) do
      {:ok, %{agent: agent.type, model: model, config_options: opts}}
    else
      nil -> {:error, "agent #{attrs[:agent] || "default"} is not offered by devbox #{devbox.name}"}
      err -> err
    end
  end

  defp resolve_model(agent, nil, billing), do: {:ok, default_model(agent, billing)}
  defp resolve_model(%Devbox.Agent{model_switchable: false} = agent, model, billing) do
    case {default_model(agent, billing), offered_models(agent, billing)} do
      {^model, _} -> {:ok, model}
      {_, offered} -> if model in offered, do: {:ok, model}, else: {:error, "the #{agent.type} agent on this devbox doesn't allow choosing a model"}
    end
  end
  defp resolve_model(agent, model, billing) do
    offered = offered_models(agent, billing)
    case model in offered do
      true -> {:ok, model}
      false -> {:error, "model #{model} is not offered for the #{agent.type} agent, available models: #{Enum.join(offered, ", ")}"}
    end
  end

  @doc """
  The models offered for a box's agent under a billing mode.  On the AI proxy these are the proxy's models (see
  `ProxyModels.narrow/3`); on a subscription, the probed catalog narrowed by the runner's allowlist.
  """
  @spec offered_models(Devbox.Agent.t, :proxy | :subscription) :: [binary]
  def offered_models(agent, billing \\ :proxy)
  def offered_models(%Devbox.Agent{} = agent, :subscription), do: Devbox.Agent.offered_models(agent)
  def offered_models(%Devbox.Agent{} = agent, _),
    do: ProxyModels.narrow(agent, Devbox.Agent.offered_models(agent), ProxyModels.for_agent(agent.type))

  @doc "The model preselected for a box's agent, kept within `offered_models/2`"
  @spec default_model(Devbox.Agent.t, :proxy | :subscription) :: binary | nil
  def default_model(%Devbox.Agent{} = agent, billing \\ :proxy) do
    case {Devbox.Agent.default_model(agent), offered_models(agent, billing)} do
      {m, []} -> m
      {m, offered} -> if m in offered, do: m, else: hd(offered)
    end
  end

  @doc """
  Rejects an `autonomy` config option value above the box's cap. The probed catalog lists every level an agent
  supports, whatever the runner allows; the daemon enforces the cap too.
  """
  @spec check_autonomy(Devbox.t, map) :: {:ok, map} | error
  def check_autonomy(devbox, %{"autonomy" => level} = opts) do
    case Devbox.autonomy_allowed?(devbox, level) do
      true -> {:ok, opts}
      false -> {:error, "autonomy #{level} is above this devbox's max of #{Devbox.autonomy(devbox).max}"}
    end
  end
  def check_autonomy(_, opts), do: {:ok, opts}

  @doc """
  Rejects `autonomy: auto` for an agent billed to the AI proxy when the proxy can't serve decisions: the
  harnesses' own reviewers call models the proxy can't route, so there the daemon reviews with a decision model
  instead (see `decision_review?/0`). The probed catalog lists auto regardless, since it covers subscription-billed
  instances too.
  """
  @spec check_proxy_auto(DevboxInstance.t, atom | binary, map) :: {:ok, map} | error
  def check_proxy_auto(inst, agent, %{"autonomy" => "auto"} = opts) do
    case Billing.subscription?(inst, agent) || decision_review?() do
      true -> {:ok, opts}
      false -> {:error, "autonomy auto needs the #{agent} agent billed to a subscription, or AI enabled in deployment settings with a provider that serves decisions"}
    end
  end
  def check_proxy_auto(_, _, opts), do: {:ok, opts}

  @doc """
  Whether the AI proxy serves `/v1/decisions`, so devbox daemons can review permission requests at autonomy auto:
  AI is enabled with a provider nexus routes decisions to (natively, or emulated with the provider's chat model).
  """
  @spec decision_review?() :: boolean
  def decision_review?() do
    case Console.Deployments.Settings.cached() do
      %{ai: %{enabled: true} = ai} -> decision_provider?(ai.decision_provider) || decision_provider?(ai.provider)
      _ -> false
    end
  end

  defp decision_provider?(provider), do: provider in ~w(openai openai_compatible anthropic azure bedrock vertex xai)a

  @doc """
  Validates config option values (`[%{config_id, value}]`) against the options the agent advertises.
  """
  @spec resolve_config_options([map] | nil, [map] | nil) :: {:ok, map} | error
  def resolve_config_options(_, empty) when empty in [nil, []], do: {:ok, %{}}
  def resolve_config_options(options, values) do
    by_id = Map.new(options || [], & {&1.config_id, &1})
    Enum.reduce_while(values, {:ok, %{}}, fn %{config_id: id, value: v}, {:ok, acc} ->
      case by_id do
        %{^id => opt} -> valid_config_value(opt, v, acc)
        _ -> {:halt, {:error, "config option #{id} is not offered by this agent"}}
      end
    end)
  end

  defp valid_config_value(opt, value, acc) do
    case Console.Schema.DevboxInstanceSession.ConfigOption.values(opt) do
      [] -> {:cont, {:ok, Map.put(acc, opt.config_id, value)}}
      values ->
        case Enum.member?(values, value) do
          true -> {:cont, {:ok, Map.put(acc, opt.config_id, value)}}
          false -> {:halt, {:error, "#{value} is not a valid value for config option #{opt.config_id}"}}
        end
    end
  end

  defp resolve_repositories(devbox, _, [_ | _] = repos) do
    case Enum.reject(repos, &Devbox.allowed_repository?(devbox, &1)) do
      [] -> {:ok, repos}
      bad -> {:error, "repositories not allowed on devbox #{devbox.name}: #{Enum.join(bad, ", ")}"}
    end
  end
  defp resolve_repositories(devbox, %Workbench{configuration: %{coding: %{repositories: [_ | _] = repos}}}, _),
    do: {:ok, Enum.filter(repos, &Devbox.allowed_repository?(devbox, &1))}
  defp resolve_repositories(_, _, _), do: {:ok, []}

  defp restore_fidelity(nil, _), do: nil
  defp restore_fidelity(%DevboxSnapshot{template_revision: rev, fidelity: fidelity}, %Devbox{template_revision: rev}),
    do: fidelity || :memory
  defp restore_fidelity(%DevboxSnapshot{}, _), do: :filesystem

  @doc """
  The idle policy pushed to the gateway: the box's, narrowed by the workbench's devbox settings.
  """
  @spec idle_policy(Devbox.t, Workbench.t | nil) :: map
  def idle_policy(%Devbox{} = devbox, workbench) do
    policy = Devbox.idle_policy(devbox)
    case workbench do
      %Workbench{configuration: %{devbox: %{max_deferral: max}}} when is_integer(max) ->
        %{policy | max_deferral: min(policy.max_deferral, max)}
      _ -> policy
    end
  end

  @doc """
  Switches one agent of an instance between AI proxy and subscription billing (owner only), restarting its agent
  connection on the gateway.
  """
  @spec set_agent_billing(binary, map, User.t) :: instance_resp
  def set_agent_billing(id, %{agent: agent} = entry, %User{} = user) do
    start_transaction()
    |> add_operation(:instance, fn _ -> DevboxInstance.with_lock() |> Repo.get!(id) |> ensure_live() end)
    |> add_operation(:update, fn %{instance: inst} -> Billing.update(inst, entry, user) end)
    |> add_operation(:control, fn %{update: inst} ->
      Control.set_agent_billing(inst, Map.put(Billing.for_agent(inst, agent), :principal, user))
      |> control_result(inst)
    end)
    |> execute(extract: :update)
    |> notify(:update)
  end

  @doc """
  Cancels an instance.  Allowed for its owner and workbench writers.  The actor is deleted asynchronously off the
  `DevboxInstanceEnded` event (see `delete_actor/1`), so this succeeds even if the cluster is offline.
  """
  @spec cancel_instance(binary, User.t) :: instance_resp
  def cancel_instance(id, %User{} = user) do
    start_transaction()
    |> add_operation(:instance, fn _ ->
      DevboxInstance.with_lock()
      |> Repo.get!(id)
      |> allow(user, :cancel)
    end)
    |> add_operation(:live, fn %{instance: inst} -> ensure_live(inst) end)
    |> add_operation(:update, fn %{instance: inst} -> end_instance(inst, :cancelled, "cancelled by #{user.email}") end)
    |> execute(extract: :update)
    |> notify(:end)
  end

  @doc """
  Asks the gateway to delete an ended instance's actor.  Best effort: if the cluster is offline or the call fails,
  the gateway's next heartbeat finds the instance among those console reports as unknown and ends it then.
  """
  @spec delete_actor(DevboxInstance.t) :: :ok
  def delete_actor(%DevboxInstance{} = inst) do
    case Control.cancel_instance(inst) do
      {:error, :not_connected} -> :ok
      {:error, err} -> Logger.warning("could not delete the actor of devbox instance #{inst.id}: #{inspect(err)}")
      _ -> :ok
    end
  end

  @doc """
  Asks the gateway to suspend an instance now.  The status changes when the gateway reports it.
  """
  @spec suspend_instance(binary, User.t) :: instance_resp
  def suspend_instance(id, %User{} = user) do
    with {:ok, inst} <- allow(get_instance!(id), user, :cancel),
         {:ok, inst} <- ensure_status(inst, [:running]),
      do: Control.suspend_instance(inst) |> control_result(inst)
  end

  @doc """
  Asks the gateway to resume a suspended instance.
  """
  @spec resume_instance(binary, User.t) :: instance_resp
  def resume_instance(id, %User{} = user) do
    with {:ok, inst} <- allow(get_instance!(id), user, :keep_awake),
         {:ok, inst} <- claim_resume(inst.id) do
      # the gateway keeps waking it past a :starting (or a call that timed out on the way) and reports running
      # when it's up
      res = case Control.resume_instance(inst) do
        {:error, reason} when reason in [:starting, :timeout] -> :ok
        res -> res
      end
      # re-read: the gateway reports running before ResumeInstance returns, and answering with the suspended copy
      # would overwrite that status in the client's cache
      with {:ok, _} <- control_result(res, inst),
        do: {:ok, Repo.get!(DevboxInstance, inst.id)}
    end
  end

  # Restarts a suspended instance's completeAfter clock under its lock, so `complete_stale_instances` can't end it
  # while the resume is in flight.  The lock can't be held across the resume: the gateway reports `running`
  # (which locks the instance) before ResumeInstance returns.
  defp claim_resume(id) do
    start_transaction()
    |> add_operation(:instance, fn _ -> DevboxInstance.with_lock() |> Repo.get!(id) |> ensure_status([:suspended]) end)
    |> add_operation(:claim, fn %{instance: inst} ->
      DevboxInstance.changeset(inst, %{suspended_at: DateTime.utc_now()})
      |> Repo.update()
    end)
    |> execute(extract: :claim)
  end

  @doc """
  Moves an instance to a terminal state and revokes its credentials.
  """
  @spec end_instance(DevboxInstance.t, atom, binary | nil) :: instance_resp
  def end_instance(%DevboxInstance{} = inst, status, reason) do
    with {:ok, inst} <- DevboxInstance.changeset(inst, %{status: status, status_reason: reason}) |> Repo.update(),
      do: Credentials.revoke(inst)
  end

  @doc """
  Completes instances that have been suspended longer than their box's `completeAfter`.  The actor is deleted, the
  transcript and snapshots are kept.
  """
  @spec complete_stale_instances() :: [DevboxInstance.t]
  def complete_stale_instances() do
    DevboxInstance.for_status(:suspended)
    |> Repo.all()
    |> Repo.preload([:devbox])
    |> Enum.filter(&stale?/1)
    |> Enum.map(&complete_stale/1)
    |> Enum.flat_map(fn
      {:ok, inst} -> [inst]
      _ -> []
    end)
  end

  # Rechecks the instance under its lock, since it may have been resumed (see `claim_resume/1`) since it was listed.
  defp complete_stale(%DevboxInstance{id: id}) do
    start_transaction()
    |> add_operation(:instance, fn _ ->
      inst = DevboxInstance.with_lock() |> Repo.get!(id) |> Repo.preload([:devbox])
      case inst.status == :suspended and stale?(inst) do
        true -> {:ok, inst}
        false -> {:error, :not_stale}
      end
    end)
    |> add_operation(:update, fn %{instance: inst} ->
      end_instance(inst, :completed, "suspended for longer than the box's completeAfter")
    end)
    |> execute(extract: :update)
    |> notify(:end)
  end

  @doc """
  Fails instances still pending well after they were created: the gateway reports `provisioning` before
  CreateInstance returns, so these never reached it (console went down before asking).
  """
  @spec fail_unstarted_instances() :: [DevboxInstance.t]
  def fail_unstarted_instances() do
    DevboxInstance.pending_before(Timex.now() |> Timex.shift(minutes: -10))
    |> Repo.all()
    |> Enum.map(&fail_start(&1, "never reached its cluster", [:pending]))
    |> Enum.flat_map(fn
      {:ok, inst} -> [inst]
      _ -> []
    end)
  end

  defp stale?(%DevboxInstance{suspended_at: %DateTime{} = at, devbox: devbox}) do
    %{complete_after: secs} = Devbox.idle_policy(devbox)
    DateTime.diff(DateTime.utc_now(), at, :second) > secs
  end
  defp stale?(_), do: false

  @doc """
  Snapshots an instance (suspend with synchronous durability, tag, resume).  The snapshot turns `ready` when the
  gateway reports it.
  """
  @spec create_snapshot(map, binary, User.t) :: snapshot_resp
  def create_snapshot(attrs, instance_id, %User{id: user_id} = user) do
    start_transaction()
    |> add_operation(:instance, fn _ -> ensure_status(get_instance!(instance_id), [:running, :suspended]) end)
    |> add_operation(:snapshot, fn %{instance: inst} ->
      %DevboxSnapshot{
        workbench_id: inst.workbench_id,
        devbox_id: inst.devbox_id,
        instance_id: inst.id,
        user_id: user_id,
        template_revision: inst.template_revision
      }
      |> DevboxSnapshot.changeset(Map.merge(%{status: :pending}, Map.take(attrs, [:name])))
      |> allow(user, :create)
      |> when_ok(:insert)
    end)
    |> execute()
    |> case do
      {:ok, %{instance: inst, snapshot: snapshot}} ->
        notify({:ok, snapshot}, :update)
        take_snapshot(inst, snapshot)
      err -> err
    end
  end

  # like `start_instance/2`, the gateway reports the snapshot by id, so it must be committed first
  defp take_snapshot(%DevboxInstance{} = inst, %DevboxSnapshot{} = snapshot) do
    case Control.snapshot_instance(inst, snapshot) |> control_result(snapshot) do
      {:ok, snapshot} -> {:ok, snapshot}
      err ->
        with %DevboxSnapshot{status: :pending} = snapshot <- Repo.get(DevboxSnapshot, snapshot.id) do
          snapshot
          |> DevboxSnapshot.changeset(%{status: :failed, error: error_message(err)})
          |> Repo.update()
          |> notify(:update)
        end
        err
    end
  end

  @doc """
  Deletes a snapshot: its owner or workbench writers.  Fails while the cluster is offline, since the tag must go too.
  """
  @spec delete_snapshot(binary, User.t) :: snapshot_resp
  def delete_snapshot(id, %User{} = user) do
    get_snapshot!(id)
    |> allow(user, :delete)
    |> when_ok(&purge_snapshot/1)
  end

  defp purge_snapshot(%DevboxSnapshot{status: :ready} = snapshot) do
    with {:ok, snapshot} <- Control.delete_snapshot(snapshot) |> control_result(snapshot),
      do: Repo.delete(snapshot) |> notify(:update)
  end
  defp purge_snapshot(%DevboxSnapshot{status: :failed} = snapshot), do: Repo.delete(snapshot) |> notify(:update)
  defp purge_snapshot(_), do: {:error, "only ready or failed snapshots can be deleted"}

  @doc """
  Deletes the oldest ready snapshots of a workbench beyond its `maxSnapshots`.
  """
  @spec prune_snapshots(binary) :: [DevboxSnapshot.t]
  def prune_snapshots(workbench_id) do
    case Workbenches.get_workbench!(workbench_id) do
      %Workbench{configuration: %{devbox: %{max_snapshots: max}}} when is_integer(max) ->
        DevboxSnapshot.for_workbench(workbench_id)
        |> DevboxSnapshot.for_status(:ready)
        |> DevboxSnapshot.ordered()
        |> DevboxSnapshot.offset(max)
        |> Repo.all()
        |> Enum.map(&purge_snapshot/1)
        |> Enum.flat_map(fn
          {:ok, snapshot} -> [snapshot]
          err ->
            Logger.warning("failed to prune devbox snapshot: #{inspect(err)}")
            []
        end)
      _ -> []
    end
  end

  @doc """
  Records that a user is viewing an instance (a visible workbench tab).  Clients call this about every 30s.  The
  aggregate viewer lease is pushed to the gateway when it toggles or moves enough, and an idle-suspended instance resumes.
  """
  @spec ping_instance(binary, User.t) :: instance_resp
  def ping_instance(id, %User{id: user_id} = user) do
    expires = DateTime.add(DateTime.utc_now(), @viewer_ttl, :second)
    update_viewers(id, user, &Map.put(&1, user_id, DateTime.to_iso8601(expires)))
    |> when_ok(&maybe_resume/1)
  end

  @doc """
  Drops a user's viewer lease (the tab was closed or hidden).
  """
  @spec leave_instance(binary, User.t) :: instance_resp
  def leave_instance(id, %User{id: user_id} = user), do: update_viewers(id, user, &Map.delete(&1, user_id))

  defp update_viewers(id, user, fun) do
    start_transaction()
    |> add_operation(:instance, fn _ ->
      DevboxInstance.with_lock()
      |> Repo.get!(id)
      |> allow(user, :read)
    end)
    |> add_operation(:live, fn %{instance: inst} -> ensure_live(inst) end)
    |> add_operation(:update, fn %{instance: inst} ->
      viewers = fun.(active_viewers(inst.viewers))
      inst
      |> DevboxInstance.changeset(%{viewers: viewers, viewer_lease_until: viewer_lease(viewers)})
      |> Repo.update()
    end)
    |> add_operation(:leases, fn %{instance: old, update: new} -> maybe_push_leases(old, new) end)
    |> execute(extract: :leases)
  end

  defp active_viewers(viewers) do
    now = DateTime.utc_now()
    (viewers || %{})
    |> Enum.filter(fn {_, exp} -> after?(exp, now) end)
    |> Map.new()
  end

  defp viewer_lease(viewers) when map_size(viewers) == 0, do: nil
  defp viewer_lease(viewers) do
    Map.values(viewers)
    |> Enum.map(&parse_ts/1)
    |> Enum.max(DateTime)
  end

  defp maybe_push_leases(%DevboxInstance{viewer_lease_until: old}, %DevboxInstance{viewer_lease_until: new} = inst) do
    case lease_moved?(old, new) do
      true -> push_leases(inst)
      false -> {:ok, inst}
    end
  end

  # `old` is the last ping's lease, not the last one pushed, so pings closer together than @lease_resync never
  # move it far enough on their own; pushing whenever the lease crosses a @lease_resync boundary keeps the
  # gateway's copy within @lease_resync of the real one
  @doc false
  def lease_moved?(nil, nil), do: false
  def lease_moved?(nil, _), do: true
  def lease_moved?(_, nil), do: true
  def lease_moved?(old, new), do: lease_window(old) != lease_window(new)

  defp lease_window(ts), do: div(DateTime.to_unix(ts), @lease_resync)

  # only an idle suspend: a visible tab's viewer lease should have vetoed it, so it lost a race with the lease (e.g.
  # the tab opened mid-suspend); a user's suspend or the awake ceiling must stick while the tab stays open
  defp maybe_resume(%DevboxInstance{status: :suspended, status_reason: "suspended: idle"} = inst) do
    with {:ok, claimed} <- claim_resume(inst.id),
      do: Control.resume_instance(claimed)
    {:ok, inst}
  end
  defp maybe_resume(inst), do: {:ok, inst}

  @doc """
  Keeps an instance awake until `until`, clamped to the effective `maxDeferral` and to the box's
  `maxContinuousAwake` ceiling (measured from when the instance last woke up).
  """
  @spec keep_awake(binary, DateTime.t, User.t) :: instance_resp
  def keep_awake(id, %DateTime{} = until, %User{id: user_id} = user) do
    start_transaction()
    |> add_operation(:instance, fn _ ->
      DevboxInstance.with_lock()
      |> Repo.get!(id)
      |> Repo.preload([:devbox, :workbench])
      |> allow(user, :keep_awake)
    end)
    |> add_operation(:live, fn %{instance: inst} -> ensure_live(inst) end)
    |> add_operation(:granted, fn %{instance: inst} -> clamp_deferral(inst, until) end)
    |> add_operation(:update, fn %{instance: inst, granted: granted} ->
      inst
      |> DevboxInstance.changeset(%{keep_awake_until: granted, keep_awake_by_id: user_id})
      |> Repo.update()
    end)
    |> add_operation(:leases, fn %{update: inst} -> push_leases(inst) end)
    |> execute(extract: :leases)
    |> notify(:update)
  end

  @doc """
  Cancels an instance's keep-awake deferral.
  """
  @spec cancel_keep_awake(binary, User.t) :: instance_resp
  def cancel_keep_awake(id, %User{} = user) do
    start_transaction()
    |> add_operation(:instance, fn _ ->
      DevboxInstance.with_lock()
      |> Repo.get!(id)
      |> allow(user, :keep_awake)
    end)
    |> add_operation(:update, fn %{instance: inst} ->
      inst
      |> DevboxInstance.changeset(%{keep_awake_until: nil, keep_awake_by_id: nil})
      |> Repo.update()
    end)
    |> add_operation(:leases, fn %{update: inst} -> push_leases(inst) end)
    |> execute(extract: :leases)
    |> notify(:update)
  end

  @doc """
  The deferral actually granted for a requested keep-awake time.
  """
  @spec clamp_deferral(DevboxInstance.t, DateTime.t) :: {:ok, DateTime.t} | error
  def clamp_deferral(%DevboxInstance{devbox: devbox, workbench: wb} = inst, until) do
    now = DateTime.utc_now()
    %{max_deferral: max_deferral, max_continuous_awake: max_awake} = idle_policy(devbox, wb)
    ceiling = DateTime.add(inst.awake_since || now, max_awake, :second)

    [until, DateTime.add(now, max_deferral, :second), ceiling]
    |> Enum.min(DateTime)
    |> then(fn granted ->
      case DateTime.compare(granted, now) do
        :gt -> {:ok, granted}
        _ -> {:error, "this instance has reached its maximum continuous awake time and can't be kept awake longer"}
      end
    end)
  end

  @doc """
  The live leases for an instance, as pushed with `Control.set_instance_leases`.
  """
  @spec leases(DevboxInstance.t) :: [map]
  def leases(%DevboxInstance{} = inst) do
    now = DateTime.utc_now()
    [
      inst.viewer_lease_until && %{kind: :viewer, holder: nil, expires_at: inst.viewer_lease_until},
      inst.keep_awake_until && %{
        kind: :deferral,
        holder: inst.keep_awake_by_id && %{user_id: inst.keep_awake_by_id},
        expires_at: inst.keep_awake_until
      }
    ]
    |> Enum.filter(&(&1 && DateTime.compare(&1.expires_at, now) == :gt))
  end

  @doc """
  Pushes an instance's leases to the gateway with a new lease generation.  An unreachable cluster is not an error:
  leases are absolute-expiry and re-synced on the next `RegisterGateway`.
  """
  @spec push_leases(DevboxInstance.t) :: instance_resp
  def push_leases(%DevboxInstance{lease_generation: gen} = inst) do
    with {:ok, inst} <- DevboxInstance.changeset(inst, %{lease_generation: (gen || 0) + 1}) |> Repo.update() do
      case Control.set_instance_leases(inst, %{generation: inst.lease_generation, leases: leases(inst)}) do
        {:error, err} -> Logger.info("could not push leases for devbox instance #{inst.id}: #{inspect(err)}")
        _ -> :ok
      end
      {:ok, inst}
    end
  end

  @doc """
  Ensures an instance is not in a terminal state.
  """
  @spec ensure_live(DevboxInstance.t) :: instance_resp
  def ensure_live(%DevboxInstance{} = inst) do
    case DevboxInstance.terminal?(inst) do
      false -> {:ok, inst}
      true -> {:error, "devbox instance has already ended (#{inst.status})"}
    end
  end

  @doc """
  Ensures an instance is in one of the given states.
  """
  @spec ensure_status(DevboxInstance.t, [atom]) :: instance_resp
  def ensure_status(%DevboxInstance{status: status} = inst, statuses) do
    case status in statuses do
      true -> {:ok, inst}
      false -> {:error, "devbox instance is #{status}, expected one of #{Enum.join(statuses, ", ")}"}
    end
  end

  @doc """
  Maps a `Control` result to `{:ok, resource}` or a typed error.
  """
  @spec control_result(Control.result, term) :: {:ok, term} | error
  def control_result(:ok, resource), do: {:ok, resource}
  def control_result({:ok, _}, resource), do: {:ok, resource}
  def control_result(err, _), do: Error.control(err)

  defp after?(ts, now) when is_binary(ts), do: DateTime.compare(parse_ts(ts), now) == :gt
  defp after?(_, _), do: false

  defp parse_ts(ts) do
    {:ok, dt, _} = DateTime.from_iso8601(ts)
    dt
  end

  def notify({:ok, %DevboxInstance{} = inst}, :create), do: handle_notify(PubSub.DevboxInstanceCreated, inst)
  def notify({:ok, %DevboxInstance{} = inst}, :update), do: handle_notify(PubSub.DevboxInstanceUpdated, inst)
  def notify({:ok, %DevboxInstance{} = inst}, :end), do: handle_notify(PubSub.DevboxInstanceEnded, inst)
  def notify({:ok, %DevboxSnapshot{} = snap}, :update), do: handle_notify(PubSub.DevboxSnapshotUpdated, snap)
  def notify(pass, _), do: pass
end
