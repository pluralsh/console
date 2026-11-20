defmodule Console.Devboxes.Ingest do
  @moduledoc """
  Everything the devbox gateway reports through `devbox.v1.Ingest` (relayed by KAS, which stamps the cluster it
  verified).  Every function takes that cluster and checks the named instance, snapshot or box belongs to it.

  Request maps use the proto field names, snake_case and atom-keyed, as decoded by the gRPC server.  Enum values may
  be plain atoms (`:running`) or proto enum atoms (`:INSTANCE_STATUS_RUNNING`).
  """
  use Console.Services.Base
  use Nebulex.Caching
  require Logger
  import Console.Deployments.Pr.Git, only: [backfill_token: 1, to_http: 2]
  alias Console.PubSub
  alias Console.Devboxes
  alias Console.Prom.Tokens
  alias Console.Devboxes.{Acp, AgentCredentials, Credentials}
  alias Console.Deployments.Pr.Dispatcher
  alias Console.Deployments.Workbenches
  alias Console.Schema.{
    Cluster,
    Devbox,
    DevboxInstance,
    DevboxInstanceSession,
    DevboxInstanceInteraction,
    DevboxSnapshot,
    PullRequest,
    ScmConnection,
    User
  }

  @multilevel_adapter Console.conf(:multilevel_cache)
  @heartbeat_interval 30

  @type error :: Console.error

  @doc """
  `Ingest.RegisterGateway`: returns the cluster and the live instances console expects, with their leases.
  """
  @spec register_gateway(map, Cluster.t) :: {:ok, map}
  def register_gateway(_attrs, %Cluster{id: cluster_id}) do
    instances =
      DevboxInstance.for_cluster(cluster_id)
      |> DevboxInstance.live()
      |> Repo.all()
      |> Enum.map(&summary/1)

    {:ok, %{cluster_id: cluster_id, heartbeat_interval_seconds: @heartbeat_interval, instances: instances}}
  end

  defp summary(%DevboxInstance{} = inst) do
    %{
      instance_id: inst.id,
      devbox_id: inst.devbox_id,
      status: inst.status,
      leases: Devboxes.leases(inst),
      lease_generation: inst.lease_generation
    }
  end

  @doc """
  `Ingest.Heartbeat`: refreshes each instance's idle state and returns the ids console doesn't know or has ended,
  which the gateway garbage-collects.
  """
  @spec heartbeat(map, Cluster.t) :: {:ok, %{unknown_instance_ids: [binary]}}
  def heartbeat(%{instances: [_ | _] = beats}, %Cluster{id: cluster_id}) do
    ids = Enum.map(beats, & &1.instance_id)
    known =
      DevboxInstance.for_cluster(cluster_id)
      |> DevboxInstance.for_ids(ids)
      |> Repo.all()
      |> Map.new(& {&1.id, &1})

    Enum.each(beats, fn beat ->
      case Map.get(known, beat.instance_id) do
        %DevboxInstance{} = inst -> heartbeat_instance(inst, beat)
        _ -> :ok
      end
    end)

    unknown = Enum.reject(ids, fn id -> match?(%DevboxInstance{}, known[id]) && !DevboxInstance.terminal?(known[id]) end)
    {:ok, %{unknown_instance_ids: unknown}}
  end
  def heartbeat(_, _), do: {:ok, %{unknown_instance_ids: []}}

  defp heartbeat_instance(%DevboxInstance{} = inst, %{idle: %{} = idle}) do
    inst
    |> DevboxInstance.changeset(%{idle_state: idle_state(idle)})
    |> Repo.update()
  end
  defp heartbeat_instance(_, _), do: :ok

  @doc """
  `Ingest.ReportInstanceStatus`: applies a state machine transition reported by the gateway.  Reports with an older
  generation are ignored, ended instances stay ended (cancelled wins over a late running) and invalid transitions
  only update the idle state.  Returns console's view of the instance.
  """
  @spec report_instance_status(map, Cluster.t) :: {:ok, DevboxInstance.t} | error
  def report_instance_status(%{instance_id: id} = attrs, %Cluster{} = cluster) do
    start_transaction()
    |> add_operation(:owned, fn _ -> owned(id, cluster) end)
    |> add_operation(:instance, fn _ -> {:ok, Repo.get!(DevboxInstance.with_lock(), id)} end)
    |> add_operation(:update, fn %{instance: inst} -> apply_status(inst, attrs) end)
    |> execute(extract: :update)
    |> case do
      {:ok, {:changed, inst}} -> Devboxes.notify({:ok, inst}, :update)
      {:ok, {_, inst}} -> {:ok, inst}
      err -> err
    end
  end

  defp apply_status(%DevboxInstance{status_generation: gen} = inst, %{generation: new}) when is_integer(new) and new > 0 and new <= gen,
    do: {:ok, {:stale, inst}}
  defp apply_status(%DevboxInstance{status: status} = inst, _) when status in ~w(completed failed cancelled)a,
    do: {:ok, {:ended, inst}}
  defp apply_status(%DevboxInstance{} = inst, attrs) do
    status = enum(attrs[:status], "instance_status_")
    base = drop_nils(%{
      status_generation: attrs[:generation],
      actor_ref: blank(attrs[:actor_id]),
      image_digest: blank(attrs[:image_digest]),
      template_revision: attrs[:template_revision] && to_string(attrs[:template_revision]),
      idle_state: attrs[:idle] && idle_state(attrs[:idle])
    })

    case status && DevboxInstance.can_transition?(inst.status, status) do
      true ->
        # idleness from before a suspend or resume no longer holds; the next heartbeat reports it afresh
        base = if status != inst.status, do: Map.put_new(base, :idle_state, idle_state(%{})), else: base
        inst
        |> DevboxInstance.changeset(Map.merge(base, %{status: status, status_reason: status_reason(attrs)}))
        |> Repo.update()
        |> when_ok(&revoke_if_ended/1)
        |> when_ok(& {:changed, &1})
      _ ->
        inst
        |> DevboxInstance.changeset(base)
        |> Repo.update()
        |> when_ok(& {:unchanged, &1})
    end
  end

  defp revoke_if_ended(%DevboxInstance{} = inst) do
    case DevboxInstance.terminal?(inst) do
      true -> Credentials.revoke(inst)
      false -> {:ok, inst}
    end
  end

  defp status_reason(%{error: %{message: msg}}) when is_binary(msg) and byte_size(msg) > 0, do: msg
  defp status_reason(%{message: msg}) when is_binary(msg) and byte_size(msg) > 0, do: msg
  defp status_reason(%{suspend_reason: reason}) when not is_nil(reason) do
    case enum(reason, "suspend_reason_") do
      nil -> nil
      r -> "suspended: #{String.replace(to_string(r), "_", " ")}"
    end
  end
  defp status_reason(_), do: nil

  @doc """
  `Ingest.ReportSnapshot`: marks a snapshot ready or failed, then prunes the workbench's oldest snapshots beyond
  its `maxSnapshots`.
  """
  @spec report_snapshot(map, Cluster.t) :: {:ok, DevboxSnapshot.t} | error
  def report_snapshot(%{snapshot_id: id} = attrs, %Cluster{id: cluster_id}) do
    snapshot = Devboxes.get_snapshot!(id) |> Repo.preload([:devbox])
    with %DevboxSnapshot{devbox: %Devbox{cluster_id: ^cluster_id}} <- snapshot,
         {:ok, snapshot} <- update_snapshot(snapshot, attrs) do
      _ = maybe_prune(snapshot)
      Devboxes.notify({:ok, snapshot}, :update)
    else
      %DevboxSnapshot{} -> {:error, "clusters can only report snapshots of their own devboxes"}
      err -> err
    end
  end

  defp update_snapshot(snapshot, attrs) do
    ref = attrs[:snapshot] || %{}
    status = case enum(attrs[:state], "snapshot_state_") do
      :succeeded -> :ready
      _ -> :failed
    end

    snapshot
    |> DevboxSnapshot.changeset(drop_nils(%{
      status: status,
      tag_ref: blank(Acp.get(ref, :tag_ref) || Acp.get(ref, :ref)),
      fidelity: enum(Acp.get(ref, :fidelity), "snapshot_fidelity_"),
      size_bytes: attrs[:size_bytes],
      error: attrs[:error] && Acp.get(attrs[:error], :message)
    }))
    |> Repo.update()
  end

  defp maybe_prune(%DevboxSnapshot{status: :ready, workbench_id: wid}), do: Devboxes.prune_snapshots(wid)
  defp maybe_prune(_), do: []

  @doc """
  `Ingest.UpsertInstanceIndex`: writes the thin index (sessions, interactions and instance aggregates) in one
  transaction.  Every row is applied only when its revision is newer than the stored one, and is locked only while
  it is checked and written; the instance row is locked last, for the aggregate.  AI-proxy usage cost deltas are
  charged to the workbench budget in the same transaction, and the changed rows are published on
  `devboxInstanceIndexDelta` (and thread updates on `devboxThreadDelta`).
  """
  @spec upsert_instance_index(map, Cluster.t) :: {:ok, %{sessions_applied: integer, interactions_applied: integer}} | error
  def upsert_instance_index(%{instance_id: id} = attrs, %Cluster{} = cluster) do
    start_transaction()
    |> add_operation(:owned, fn _ -> owned(id, cluster) end)
    |> add_operation(:sessions, fn _ -> upsert_rows(attrs[:sessions] || [], &upsert_session(id, &1)) end)
    |> add_operation(:interactions, fn _ -> upsert_rows(attrs[:interactions] || [], &upsert_interaction(id, &1)) end)
    |> add_operation(:budget, fn %{sessions: sessions} -> charge_budget(id, sessions) end)
    |> add_operation(:aggregate, fn _ -> apply_aggregate(id, attrs[:aggregate]) end)
    |> execute()
    |> case do
      {:ok, %{sessions: sessions, interactions: interactions, aggregate: inst}} ->
        Enum.each(sessions, fn
          {%DevboxInstanceSession{imported: true}, _} -> :ok
          {session, prior} -> Tokens.record_delta(session.usage, prior, %{source: "devbox", agent: session.agent})
        end)
        sessions = Enum.map(sessions, &elem(&1, 0))
        Enum.each(sessions, &handle_notify(PubSub.DevboxThreadUpdated, &1))
        track_agent_auth(inst, attrs[:aggregate][:connections])
        if sessions != [] or interactions != [] or inst,
          do: publish_index(id, Map.merge(aggregate_changes(inst), %{sessions: sessions, interactions: interactions}))
        {:ok, %{sessions_applied: length(sessions), interactions_applied: length(interactions)}}
      err -> err
    end
  end

  defp upsert_rows(rows, fun) do
    Enum.reduce_while(rows, {:ok, []}, fn row, {:ok, acc} ->
      case fun.(row) do
        {:ok, nil} -> {:cont, {:ok, acc}}
        {:ok, applied} -> {:cont, {:ok, [applied | acc]}}
        err -> {:halt, err}
      end
    end)
    |> when_ok(&Enum.reverse/1)
  end

  defp aggregate_changes(%DevboxInstance{} = inst), do: %{revision: inst.index_revision, foreground_state: inst.foreground_state}
  defp aggregate_changes(_), do: %{}

  defp upsert_session(instance_id, attrs) do
    existing = find_session(instance_id, attrs, true)
    with {:ok, %DevboxInstanceSession{} = session} <- write_session(instance_id, existing, attrs),
         {:ok, _} <- adopt_children(session, existing),
      do: {:ok, {session, session_cost(existing)}}
  end

  defp write_session(instance_id, existing, attrs) do
    revision = attrs[:revision] || 0
    case existing do
      %DevboxInstanceSession{revision: rev} when is_integer(rev) and rev >= revision and revision > 0 -> {:ok, nil}
      _ ->
        attrs = session_attrs(attrs)
        (existing || %DevboxInstanceSession{instance_id: instance_id})
        |> DevboxInstanceSession.changeset(Map.merge(attrs, parent_link(instance_id, existing, attrs)))
        |> Repo.insert_or_update()
    end
  end

  # a subagent can be indexed before its parent: it links here when the parent is already known, otherwise the
  # parent adopts it when it first gets its ACP session id (`adopt_children/2`)
  defp parent_link(_, %DevboxInstanceSession{parent_id: pid}, _) when is_binary(pid), do: %{}
  defp parent_link(instance_id, _, %{parent_acp_session_id: acp}) when is_binary(acp) do
    case find_session(instance_id, %{session_id: acp}) do
      %DevboxInstanceSession{id: id} -> %{parent_id: id}
      _ -> %{}
    end
  end
  defp parent_link(_, _, _), do: %{}

  defp adopt_children(%DevboxInstanceSession{acp_session_id: acp}, %DevboxInstanceSession{acp_session_id: acp}), do: {:ok, 0}
  defp adopt_children(%DevboxInstanceSession{acp_session_id: acp} = session, _) when is_binary(acp) do
    DevboxInstanceSession.for_instance(session.instance_id)
    |> DevboxInstanceSession.orphans_of(acp)
    |> Repo.update_all(set: [parent_id: session.id])
    |> then(fn {n, _} -> {:ok, n} end)
  end
  defp adopt_children(_, _), do: {:ok, 0}

  defp find_session(instance_id, attrs, lock \\ false)
  defp find_session(instance_id, %{thread_id: tid}, lock) when is_binary(tid) and byte_size(tid) > 0 do
    case Repo.get(sessions(lock), tid) do
      %DevboxInstanceSession{instance_id: ^instance_id} = s -> s
      _ -> nil
    end
  end
  defp find_session(instance_id, %{session_id: sid}, lock) when is_binary(sid) and byte_size(sid) > 0 do
    sessions(lock)
    |> DevboxInstanceSession.for_instance(instance_id)
    |> DevboxInstanceSession.for_acp_id(sid)
    |> Repo.one()
  end
  defp find_session(_, _, _), do: nil

  defp sessions(true), do: DevboxInstanceSession.with_lock()
  defp sessions(false), do: DevboxInstanceSession

  defp session_attrs(attrs) do
    foreground = attrs[:foreground] || %{}
    usage = attrs[:usage]
    drop_nils(%{
      acp_session_id: blank(attrs[:session_id]),
      kind: enum(attrs[:kind], "session_kind_"),
      parent_acp_session_id: blank(attrs[:parent_session_id]),
      agent: enum(attrs[:agent], "agent_type_"),
      title: blank(attrs[:title]),
      cwd: blank(attrs[:cwd]) |> relative_cwd(),
      worktree_repos: attrs[:worktree_repos],
      status: enum(attrs[:status], "thread_status_"),
      imported: attrs[:imported],
      last_activity_at: Acp.timestamp(attrs[:last_activity_at]),
      entity_count: attrs[:entity_count],
      foreground_state: enum(Acp.get(foreground, :state), "foreground_state_kind_"),
      stop_reason: blank(Acp.get(foreground, :stop_reason)),
      error: mapify(Acp.get(foreground, :error)),
      background_work: wrap(Acp.get(foreground, :background_work)),
      billing: usage && billing(Acp.get(usage, :billing)),
      revision: attrs[:revision],
      config_options: attrs[:config_options] && Enum.map(attrs[:config_options], &config_option/1),
      available_commands: attrs[:available_commands] && Enum.map(attrs[:available_commands], &command/1),
      usage: usage && usage_attrs(usage)
    })
    |> clear_foreground(attrs[:foreground])
  end

  # a reported foreground replaces the last one whole, so a later turn without an error clears it
  defp clear_foreground(session, %{} = _foreground) do
    session
    |> Map.put_new(:error, nil)
    |> Map.put_new(:stop_reason, nil)
  end
  defp clear_foreground(session, _), do: session

  # the daemon reports absolute paths under the home directory, threads store ~-relative ones
  defp relative_cwd(nil), do: nil
  defp relative_cwd("~" <> _ = cwd), do: cwd
  defp relative_cwd(cwd) do
    case Regex.run(~r{^/home/[^/]+(/[^/]+)?$}, cwd) do
      [_] -> "~"
      [_, repo] -> "~#{repo}"
      _ -> nil
    end
  end

  defp config_option(opt) do
    %{
      config_id: Acp.get(opt, :id) || Acp.get(opt, :config_id),
      name: Acp.get(opt, :name),
      description: Acp.get(opt, :description),
      category: Acp.get(opt, :category),
      type: Acp.get(opt, :type),
      current_value: Acp.get(opt, :current_value),
      options: Enum.map(Acp.get(opt, :options) || [], &Map.take(mapify(&1), ~w(value name description group)a))
    }
  end

  defp command(cmd) do
    input = Acp.get(cmd, :input) || %{}
    %{name: Acp.get(cmd, :name), description: Acp.get(cmd, :description), input_hint: Acp.get(input, :hint)}
  end

  defp usage_attrs(usage) do
    cost = Acp.get(usage, :cost) || %{}
    drop_nils(%{
      context_used: Acp.get(usage, :used),
      context_size: Acp.get(usage, :size),
      total_cost: Acp.get(cost, :amount),
      currency: blank(Acp.get(cost, :currency)),
      input_tokens: Acp.get(usage, :input_tokens),
      output_tokens: Acp.get(usage, :output_tokens),
      cached_tokens: Acp.get(usage, :cached_tokens),
      reasoning_tokens: Acp.get(usage, :reasoning_tokens),
      total_tokens: Acp.get(usage, :total_tokens)
    })
  end

  defp session_cost(%DevboxInstanceSession{usage: %{total_cost: c, total_tokens: t} = usage}) do
    Map.take(usage, ~w(input_tokens output_tokens cached_tokens reasoning_tokens)a)
    |> Map.merge(%{total_cost: c || 0, total_tokens: t || 0})
  end
  defp session_cost(_), do: %{total_cost: 0, total_tokens: 0}

  defp upsert_interaction(instance_id, %{interaction_id: ext_id} = attrs) when is_binary(ext_id) and byte_size(ext_id) > 0 do
    DevboxInstanceInteraction.with_lock()
    |> Repo.get_by(instance_id: instance_id, external_id: ext_id)
    |> write_interaction(instance_id, attrs)
  end
  defp upsert_interaction(_, _), do: {:ok, nil}

  defp write_interaction(existing, instance_id, attrs) do
    revision = attrs[:revision] || 0
    case existing do
      %DevboxInstanceInteraction{revision: rev} when is_integer(rev) and rev >= revision and revision > 0 -> {:ok, nil}
      _ ->
        (existing || %DevboxInstanceInteraction{instance_id: instance_id})
        |> DevboxInstanceInteraction.changeset(interaction_attrs(instance_id, attrs))
        |> Repo.insert_or_update()
    end
  end

  defp interaction_attrs(instance_id, attrs) do
    permission = attrs[:permission] || %{}
    elicitation = attrs[:elicitation] || %{}
    answered_by = attrs[:answered_by] && Acp.get(attrs[:answered_by], :user_id)
    drop_nils(%{
      external_id: attrs[:interaction_id],
      session_id: interaction_session(instance_id, attrs),
      jsonrpc_id: blank(attrs[:jsonrpc_id]),
      tool_call_id: blank(attrs[:tool_call_id]),
      kind: interaction_kind(attrs[:kind]),
      state: enum(attrs[:state], "interaction_state_"),
      title: blank(attrs[:title]),
      message: blank(Acp.get(elicitation, :message)),
      requested_schema: mapify(Acp.get(elicitation, :requested_schema)),
      url: blank(Acp.get(elicitation, :url)),
      options: Acp.get(permission, :options) && Enum.map(Acp.get(permission, :options), &permission_option/1),
      response: mapify(attrs[:response]),
      answered_by_id: answered_by && Repo.get(User, answered_by) && answered_by,
      answered_by_policy: attrs[:answered_by] && blank(Acp.get(attrs[:answered_by], :policy)),
      answered_at: Acp.timestamp(attrs[:answered_at]),
      review: interaction_review(attrs[:review]),
      revision: attrs[:revision]
    })
  end

  defp interaction_review(nil), do: nil
  defp interaction_review(review) do
    %{
      verdict: blank(Acp.get(review, :verdict)),
      confidence: Acp.get(review, :confidence),
      risk: blank(Acp.get(review, :risk)),
      model: blank(Acp.get(review, :model)),
      escalation: blank(Acp.get(review, :escalation))
    }
  end

  defp permission_option(opt), do: %{option_id: Acp.get(opt, :option_id), name: Acp.get(opt, :name), kind: Acp.get(opt, :kind)}

  defp interaction_session(instance_id, attrs) do
    case find_session(instance_id, attrs) do
      %DevboxInstanceSession{id: id} -> id
      _ -> nil
    end
  end

  defp interaction_kind(kind) do
    case enum(kind, "interaction_kind_") do
      :elicitation_form -> :form_elicitation
      :elicitation_url -> :url_elicitation
      k -> k
    end
  end

  defp apply_aggregate(instance_id, %{revision: rev} = agg) when is_integer(rev) do
    DevboxInstance.with_lock()
    |> Repo.get!(instance_id)
    |> write_aggregate(agg)
  end
  defp apply_aggregate(_, _), do: {:ok, nil}

  defp write_aggregate(inst, %{revision: rev} = agg) do
    case rev > (inst.index_revision || 0) do
      true ->
        inst
        |> DevboxInstance.changeset(drop_nils(%{
          index_revision: rev,
          foreground_state: enum(agg[:foreground], "foreground_state_kind_"),
          running_threads: agg[:running_threads],
          waiting_threads: agg[:waiting_threads],
          last_activity_at: DateTime.utc_now(),
          agent_connections: agg[:connections] && Enum.map(agg[:connections], &connection/1),
          checkouts: agg[:checkouts] && Enum.map(agg[:checkouts], &mapify/1)
        }))
        |> Repo.update()
      false -> {:ok, nil}
    end
  end

  defp track_agent_auth(%DevboxInstance{} = inst, [_ | _] = conns) do
    Enum.each(conns, fn conn ->
      agent = enum(Acp.get(conn, :agent), "agent_type_")
      case {auth_failed?(Acp.get(conn, :error)), Acp.get(conn, :state)} do
        {true, _} -> AgentCredentials.record_auth_failure(inst, agent)
        {false, "running"} -> AgentCredentials.record_auth_success(inst, agent)
        _ -> :ok
      end
    end)
    inst
  end
  defp track_agent_auth(inst, _), do: inst

  defp auth_failed?(%{} = err) do
    case Acp.get(err, :detail) do
      %{} = detail -> enum(Acp.get(detail, :reason), "error_reason_") == :agent_auth_failed
      _ -> false
    end
  end
  defp auth_failed?(_), do: false

  defp connection(conn) do
    %{
      agent: enum(Acp.get(conn, :agent), "agent_type_"),
      protocol_version: Acp.get(conn, :protocol_version),
      adapter_name: Acp.get(conn, :adapter_name),
      adapter_version: Acp.get(conn, :adapter_version),
      capabilities: mapify(Acp.get(conn, :capabilities)),
      billing: billing(Acp.get(conn, :billing))
    }
  end

  defp billing(mode) do
    case enum(mode, "billing_mode_") do
      nil -> nil
      mode -> to_string(mode)
    end
  end

  defp charge_budget(instance_id, sessions) do
    usage = Enum.reduce(sessions, %{total_cost: 0.0, total_tokens: 0}, fn
      {%DevboxInstanceSession{billing: "subscription"}, _}, acc -> acc
      {%DevboxInstanceSession{usage: %{} = usage}, prior}, acc ->
        %{
          total_cost: acc.total_cost + max((usage.total_cost || 0) - prior.total_cost, 0),
          total_tokens: acc.total_tokens + max((usage.total_tokens || 0) - prior.total_tokens, 0)
        }
      _, acc -> acc
    end)

    case usage do
      %{total_cost: c, total_tokens: t} when c > 0 or t > 0 ->
        %DevboxInstance{workbench_id: wid} = Repo.get!(DevboxInstance, instance_id)
        Workbenches.update_budget(wid, usage)
      _ -> {:ok, nil}
    end
  end

  @doc """
  Publishes a changed index row on `devboxInstanceIndexDelta`: `changes` holds the `DevboxInstance.IndexDelta`
  fields that changed (sessions, interactions, or the aggregate's revision and foreground state).
  """
  @spec publish_index(binary, map) :: :ok
  def publish_index(instance_id, changes) when is_binary(instance_id) do
    handle_notify(PubSub.DevboxInstanceIndexUpdated, struct(DevboxInstance.IndexDelta, Map.put(changes, :instance_id, instance_id)))
    :ok
  end

  @doc """
  `Ingest.PushInstanceDeltas`: wraps each live delta in a `DevboxInstance.Delta` and broadcasts it on
  `devbox_instances:<id>:deltas`.  Nothing is stored.  Deltas for instances outside the cluster are dropped.
  """
  @spec publish_instance_deltas([map], Cluster.t) :: :ok
  def publish_instance_deltas(deltas, %Cluster{} = cluster) do
    Enum.each(deltas, fn %{instance_id: id} = delta ->
      case owned(id, cluster) do
        {:ok, _} -> publish_delta(delta, cluster)
        _ -> Logger.info("dropping devbox delta for instance #{id} not owned by cluster #{cluster.id}")
      end
    end)
  end

  defp publish_delta(delta, cluster) do
    %{
      instance_id: delta.instance_id,
      session_id: blank(delta[:session_id]),
      thread_id: blank(delta[:thread_id]),
      entity_type: delta[:entity_type] && Acp.entity_type(delta[:entity_type]),
      entity_id: blank(delta[:entity_id]),
      position: delta[:position],
      op: enum(delta[:op], "delta_op_") || :patch,
      state_kind: blank(delta[:state_kind]),
      payload: Acp.as_map(Acp.decode(delta[:payload_json] || delta[:payload])),
      entity: Acp.entity(delta[:entity]),
      offset: delta[:offset],
      emitted_at: Acp.timestamp(delta[:emitted_at])
    }
    |> DevboxInstance.Delta.new(cluster)
    |> then(&handle_notify(PubSub.DevboxInstanceDeltaCreated, &1))
  end

  @doc """
  `Ingest.GetInstanceCredentials`: mints the requested instance-scoped credentials.
  """
  @spec get_instance_credentials(binary, [map], Cluster.t) :: {:ok, [Credentials.credential]} | error
  def get_instance_credentials(instance_id, selectors, %Cluster{} = cluster) do
    with {:ok, _} <- owned(instance_id, cluster) do
      Devboxes.get_instance!(instance_id)
      |> Credentials.instance_credentials(Enum.map(selectors, &selector/1))
    end
  end

  @credential_kinds Map.new(~w(scm ai_proxy console oidc claude_oauth codex)a, & {to_string(&1), &1})

  defp selector(%{kind: kind} = sel) do
    name = kind |> to_string() |> String.downcase() |> String.replace_prefix("credential_kind_", "")
    %{sel | kind: Map.get(@credential_kinds, name)}
  end

  @doc """
  `Ingest.UpdateAgentCredential`: the refresh lease holder writes back a Codex bundle it refreshed, compare-and-swap
  on the credential's version.
  """
  @spec update_agent_credential(map, Cluster.t) :: {:ok, %{applied: boolean, current: map}} | error
  def update_agent_credential(%{instance_id: id} = attrs, %Cluster{} = cluster) do
    with {:ok, _} <- owned(id, cluster),
         {:ok, inst} <- Devboxes.ensure_live(Devboxes.get_instance!(id)) do
      AgentCredentials.update(inst, %{
        credential_id: attrs[:credential_id],
        expected_version: attrs[:expected_version],
        bundle_json: attrs[:bundle_json],
        refreshed_at: Acp.timestamp(attrs[:refreshed_at])
      })
    end
  end

  @doc """
  `Ingest.DevboxPullRequest`: creates a pull request for the devbox MCP's `create_pull_request` tool, attributed to
  the instance, the thread (if any) and, for subagents, the subagent session in its metadata.
  """
  @spec devbox_pull_request(map, binary, binary | nil, Cluster.t) :: {:ok, PullRequest.t} | error
  def devbox_pull_request(attrs, instance_id, thread_id, %Cluster{} = cluster) do
    with {:ok, _} <- owned(instance_id, cluster),
         {:ok, inst} <- Devboxes.ensure_live(Devboxes.get_instance!(instance_id) |> Repo.preload([:devbox])),
         {:ok, thread} <- pr_thread(inst, thread_id),
         %{repository: repo, title: title, head_branch: head, base_branch: base} = pr <- attrs[:attributes] || attrs,
         true <- Devbox.allowed_repository?(inst.devbox, repo) || {:error, "repository #{repo} is not allowed on this devbox"},
         %ScmConnection{} = conn <- Credentials.scm_connection(inst.devbox, repo),
         {:ok, conn} <- backfill_token(conn),
         {:ok, pr_info} <- Dispatcher.pr(conn, title, pr[:body] || "", to_http(conn, repo), base, head) do
      %PullRequest{fresh: true}
      |> PullRequest.changeset(
        pr_info
        |> Map.merge(attribution(inst, thread))
        |> Map.merge(%{
          source: :mcp,
          metadata: drop_nils(%{
            subagent_session_id: blank(attrs[:subagent_session_id]),
            tool_call_id: blank(attrs[:tool_call_id]),
            position: attrs[:position],
            related_urls: pr[:related_urls]
          })
        })
      )
      |> Repo.insert()
      |> notify_pr()
    else
      nil -> {:error, "no scm connection found for this repository"}
      %{} -> {:error, "pull request attributes require a repository, title, head and base branch"}
      err -> err
    end
  end

  defp pr_thread(_, empty) when empty in [nil, ""], do: {:ok, nil}
  defp pr_thread(%DevboxInstance{id: id}, thread_id) do
    with {:ok, tid} <- Ecto.UUID.cast(thread_id),
         %DevboxInstanceSession{instance_id: ^id} = thread <- Repo.get(DevboxInstanceSession, tid) do
      parent_thread(thread)
    else
      _ -> {:error, "thread #{thread_id} does not belong to this instance"}
    end
  end

  defp parent_thread(%DevboxInstanceSession{kind: :subagent, parent_id: pid}) when is_binary(pid),
    do: {:ok, Repo.get(DevboxInstanceSession, pid)}
  defp parent_thread(thread), do: {:ok, thread}

  defp attribution(%DevboxInstance{} = inst, thread) do
    %{
      devbox_id: inst.devbox_id,
      devbox_instance_id: inst.id,
      devbox_instance_session_id: thread && thread.id,
      workbench_id: inst.workbench_id
    }
  end

  @doc """
  `Ingest.ReportPullRequest`: records a pull request observed at egress (the backstop for PRs the agent created
  without the devbox MCP).  A no-op if a record for the URL already exists.
  """
  @spec report_observed_pull_request(map, Cluster.t) :: {:ok, %{pull_request: PullRequest.t, created: boolean}} | error
  def report_observed_pull_request(%{instance_id: id, url: url} = attrs, %Cluster{} = cluster) do
    with {:ok, _} <- owned(id, cluster) do
      case Repo.get_by(PullRequest, url: url) do
        %PullRequest{} = pr -> {:ok, %{pull_request: pr, created: false}}
        nil ->
          inst = Devboxes.get_instance!(id)
          %PullRequest{}
          |> PullRequest.changeset(
            attribution(inst, nil)
            |> Map.merge(drop_nils(%{
              url: url,
              title: observed_title(attrs),
              ref: blank(attrs[:head_branch]),
              source: :egress,
              metadata: drop_nils(%{
                provider: blank(attrs[:provider]),
                repository: blank(attrs[:repository]),
                number: attrs[:number],
                base_branch: blank(attrs[:base_branch]),
                actor_id: blank(attrs[:actor_id])
              })
            }))
          )
          |> Repo.insert()
          |> notify_pr()
          |> when_ok(& %{pull_request: &1, created: true})
      end
    end
  end

  defp observed_title(%{number: n, repository: repo}) when is_integer(n) and n > 0, do: "#{repo || "pull request"} ##{n}"
  defp observed_title(%{url: url}), do: url

  defp notify_pr({:ok, %PullRequest{} = pr}) do
    handle_notify(PubSub.PullRequestCreated, pr)
    publish_delta(%{
      instance_id: pr.devbox_instance_id,
      thread_id: pr.devbox_instance_session_id,
      op: :pull_request,
      payload: %{"id" => pr.id, "url" => pr.url, "title" => pr.title, "source" => to_string(pr.source)}
    }, nil)
    {:ok, pr}
  end
  defp notify_pr(pass), do: pass

  @doc """
  Checks an instance belongs to a cluster (cached, an instance's box never changes).
  """
  @spec owned(binary, Cluster.t) :: {:ok, binary} | error
  def owned(instance_id, %Cluster{id: cluster_id}) do
    case instance_cluster_id(instance_id) do
      ^cluster_id -> {:ok, instance_id}
      _ -> {:error, "clusters can only report on instances of their own devboxes"}
    end
  end

  @decorate cacheable(
              cache: @multilevel_adapter,
              key: {:devbox_instance_cluster, instance_id},
              opts: [ttl: :timer.hours(1)]
            )
  defp instance_cluster_id(instance_id) do
    case Ecto.UUID.cast(instance_id) do
      {:ok, id} -> Repo.one(DevboxInstance.cluster_id(id))
      _ -> nil
    end
  end

  @doc """
  Normalizes a plain or proto enum atom (`:INSTANCE_STATUS_RUNNING`) to a plain atom (`:running`).  Unspecified
  values become nil.
  """
  @spec enum(term, binary) :: atom | nil
  def enum(nil, _), do: nil
  def enum(val, prefix) when is_atom(val), do: enum(Atom.to_string(val), prefix)
  def enum(val, prefix) when is_binary(val) do
    case val |> String.downcase() |> String.replace_prefix(prefix, "") do
      v when v in ["", "unspecified"] -> nil
      v -> String.to_existing_atom(v)
    end
  rescue
    ArgumentError -> nil
  end
  def enum(_, _), do: nil

  # every field is set, nil included, so a report replaces the previous idle state rather than merging into it
  defp idle_state(idle) do
    %{
      idle: Acp.get(idle, :idle) == true,
      idle_since: Acp.timestamp(Acp.get(idle, :idle_since)),
      suspends_at: Acp.timestamp(Acp.get(idle, :suspend_at)),
      busy_reasons: Enum.map(Acp.get(idle, :busy_reasons) || [], &busy_reason/1),
      message: Acp.get(idle, :message)
    }
  end

  defp busy_reason(reason) do
    drop_nils(%{
      "kind" => Acp.get(reason, :kind) |> enum("busy_reason_kind_") |> then(&(&1 && to_string(&1))),
      "detail" => blank(Acp.get(reason, :detail)),
      "until" => Acp.timestamp(Acp.get(reason, :until)),
      "thread_id" => blank(Acp.get(reason, :thread_id)),
      "terminal_id" => blank(Acp.get(reason, :terminal_id))
    })
  end

  defp mapify(%DateTime{} = dt), do: dt
  defp mapify(%_{} = struct), do: Map.from_struct(struct) |> Map.delete(:__unknown_fields__) |> mapify()
  defp mapify(%{} = map), do: Map.new(map, fn {k, v} -> {k, mapify(v)} end)
  defp mapify(l) when is_list(l), do: Enum.map(l, &mapify/1)
  defp mapify(v), do: v

  defp wrap(nil), do: nil
  defp wrap(%{} = m), do: mapify(m)
  defp wrap(v), do: %{"value" => v}

  defp blank(""), do: nil
  defp blank(v), do: v

  defp drop_nils(map), do: Map.reject(map, fn {_, v} -> is_nil(v) end)
end
