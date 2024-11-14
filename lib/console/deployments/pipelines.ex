defmodule Console.Deployments.Pipelines do
  use Console.Services.Base
  require Logger
  use Nebulex.Caching
  import Console.Deployments.Policies
  import Console.Deployments.Pipelines.Stability
  alias Console.PubSub
  alias Console.Deployments.{Services, Clusters, Git, Settings}
  alias Console.Services.Users
  alias Kazan.Apis.Batch.V1, as: BatchV1
  alias Console.Schema.{
    Pipeline,
    PipelineStage,
    PipelineEdge,
    PipelineGate,
    StageService,
    PipelinePromotion,
    PromotionCriteria,
    PromotionService,
    PipelineContext,
    PipelineContextHistory,
    PipelinePullRequest,
    User,
    Revision,
    Service,
    Cluster
  }

  @cache Console.conf(:cache_adapter)
  @ttl :timer.minutes(5)

  @preload [:read_bindings, :write_bindings, edges: [:gates], stages: [services: :criteria]]

  @type gate_resp :: {:ok, PipelineGate.t} | Console.error
  @type stage_resp :: {:ok, PipelineStage.t} | Console.error
  @type pipeline_resp :: {:ok, Pipeline.t} | Console.error
  @type promotion_resp :: {:ok, PipelinePromotion.t} | Console.error
  @type context_resp :: {:ok, PipelineContext.t} | Console.error

  def get_pipeline(id), do: Repo.get(Pipeline, id)

  def get_pipeline!(id), do: Repo.get!(Pipeline, id)

  def get_gate!(id), do: Repo.get!(PipelineGate, id)

  def get_context!(id), do: Repo.get!(PipelineContext, id)

  def get_pipeline_by_name(name), do: Repo.get_by(Pipeline, name: name)

  def gate_job(%PipelineGate{status: %{job_ref: %{namespace: ns, name: name}}} = gate) do
    %{cluster: cluster} = Repo.preload(gate, [:cluster])
    BatchV1.read_namespaced_job!(ns, name)
    |> Kazan.run(server: Clusters.control_plane(cluster))
  end
  def gate_job(_), do: {:ok, nil}

  @doc """
  Will either create or recreate a pipeline with the given attributes. Requires write permissions to the pipeline
  """
  @spec upsert(map, binary, User.t) :: pipeline_resp
  def upsert(attrs, name, %User{} = user) do
    pipe = get_pipeline_by_name(name) |> Repo.preload(@preload)
    start_transaction()
    |> add_operation(:pipe, fn _ ->
      case pipe do
        %Pipeline{} = pipe -> pipe
        nil -> %Pipeline{project_id: attrs[:project_id] || Settings.default_project!().id}
      end
      |> ok()
    end)
    |> add_operation(:base, fn %{pipe: pipeline} ->
      attrs = stabilize(pipeline, Map.put(attrs, :name, name))
              |> Map.drop([:edges])
      pipeline
      |> allow(user, (if pipe, do: :write, else: :create))
      |> when_ok(&Pipeline.changeset(&1, attrs))
      |> when_ok(&Repo.insert_or_update/1)
    end)
    |> add_operation(:edges, fn %{base: base} ->
      base = Repo.preload(base, [:edges])
      base
      |> Pipeline.changeset(stabilize_edges(base, attrs))
      |> Repo.update()
    end)
    |> execute(extract: :edges)
    |> notify(:create, user)
  end

  @doc """
  modifies rbac settings for this pipeline
  """
  @spec rbac(map, binary, User.t) :: pipeline_resp
  def rbac(attrs, pipeline_id, %User{} = user) do
    get_pipeline!(pipeline_id)
    |> Repo.preload([:write_bindings, :read_bindings])
    |> allow(user, :write)
    |> when_ok(&Pipeline.rbac_changeset(&1, attrs))
    |> when_ok(:update)
    |> notify(:update, user)
  end

  @doc """
  Creates a context which can be used for promotions throughout a pipeline. This will be an arbitrary
  data-map for things like contextualizing pr automations
  """
  @spec create_pipeline_context(map, binary, User.t) :: context_resp
  def create_pipeline_context(attrs, pipe_id, %User{} = user) do
    start_transaction()
    |> add_operation(:pipe, fn _ ->
      get_pipeline!(pipe_id)
      |> Repo.preload([:edges, :stages, :write_bindings, :read_bindings])
      |> allow(user, :write)
    end)
    |> add_operation(:ctx, fn %{pipe: pipe} ->
      %PipelineContext{pipeline_id: pipe.id}
      |> PipelineContext.changeset(attrs)
      |> Repo.insert()
    end)
    |> add_operation(:link, fn %{pipe: pipe, ctx: ctx} ->
      entry_stages(pipe)
      |> Enum.reduce(start_transaction(), fn stage, xact ->
        add_operation(xact, stage.id, fn _ ->
          create_context_binding(ctx.id, stage)
        end)
      end)
      |> execute()
    end)
    |> execute()
    |> flush_context_events(fn %{link: links} -> Map.values(links) end, :ctx)
    |> notify(:create, user)
  end

  @spec create_context_binding(binary, PipelineStage.t) :: stage_resp
  def create_context_binding(ctx_id, %PipelineStage{} = stage) do
    stage
    |> PipelineStage.changeset(%{context_id: ctx_id})
    |> Repo.update()
  end

  @doc """
  Adds an error to a pipeline stage, eg for when prs don't spawn smoothly
  """
  @spec add_stage_error(PipelineStage.t, binary, binary) :: stage_resp
  def add_stage_error(%PipelineStage{} = stage, source, msg) do
    Repo.preload(stage, [:errors])
    |> PipelineStage.changeset(%{errors: [%{source: source, message: msg}]})
    |> Repo.update()
  end

  def apply_pipeline_context(%PipelineStage{context_id: ctx_id, applied_context_id: ctx_id} = stage) do
    Logger.info "ignoring applying existing context to stage #{stage.id}"
    {:ok, stage}
  end

  def apply_pipeline_context(%PipelineStage{} = stage) do
    bot = %{Users.get_bot!("console") | roles: %{admin: true}}
    %{context: ctx} = stage = Repo.preload(stage, [:pipeline, :context, :errors, services: [:service, criteria: :pr_automation]])
    Enum.filter(stage.services, & &1.criteria && &1.criteria.pr_automation_id)
    |> Enum.reduce(start_transaction(), fn svc, xact ->
      service = svc.service
      add_operation(xact, {:pull, svc.id}, fn _ ->
        branch = "plrl-svc/#{service.name}/pipeline-#{stage.pipeline.name}-#{String.slice(service.id, 0..4)}-#{String.slice(ctx.id, 0..4)}"
        context = build_pr_context(ctx.context, svc, stage)
        %{pr_automation_id: id, repository: repo} = svc.criteria
        Git.create_pull_request(%{service_id: service.id}, context, id, branch, repo, bot)
      end)
      |> add_operation({:ptr, svc.id}, fn res ->
        pr = Map.get(res, {:pull, svc.id})
        %PipelinePullRequest{service_id: service.id}
        |> PipelinePullRequest.changeset(%{context_id: ctx.id, pull_request_id: pr.id})
        |> Repo.insert()
      end)
    end)
    |> add_operation(:stg, fn _ ->
      PipelineStage.changeset(stage, %{applied_context_id: ctx.id, errors: []})
      |> Repo.update()
    end)
    |> add_operation(:hist, fn %{stg: %{id: stage_id, applied_context_id: ctx_id}} ->
      %PipelineContextHistory{}
      |> PipelineContextHistory.changeset(%{stage_id: stage_id, context_id: ctx_id})
      |> Repo.insert()
    end)
    |> execute(timeout: 60_000)
    |> notify(:context)
  end

  @doc """
  Reverts a pipeline context to the last in the stages history
  """
  @spec revert_pipeline_context(PipelineStage.t) :: {:ok, map} | Console.error
  def revert_pipeline_context(%PipelineStage{applied_context_id: ctx_id} = stage) when is_binary(ctx_id) do
    PipelineContextHistory.last_context(stage.id, ctx_id)
    |> Console.Repo.one()
    |> case do
      %PipelineContextHistory{context_id: ctx_id} ->
        start_transaction()
        |> add_operation(:bind, fn _ -> create_context_binding(ctx_id, stage) end)
        |> add_operation(:apply, fn %{bind: stage} -> apply_pipeline_context(stage) end)
        |> execute(extract: :apply, timeout: 60_000)
      _ ->
        {:error, "no prior context"}
    end
  end

  def revert_pipeline_context(stg_id) when is_binary(stg_id) do
    Console.Repo.get!(PipelineStage, stg_id)
    |> revert_pipeline_context()
  end

  def revert_pipeline_context(_), do: {:error, "you cannot revert this stage"}

  defp build_pr_context(ctx, %StageService{service: svc}, %PipelineStage{} = stage) do
    Map.put(ctx, "pipeline", %{
      "service" => Map.take(svc, ~w(name namespace)a),
      "stage" => Map.take(stage, ~w(name)a)
    })
    |> Console.string_map()
  end

  @doc """
  Whether all promotion gates for this edge are currently open
  """
  @spec open?(PipelineEdge.t, PipelinePromotion.t) :: boolean
  def open?(%PipelineEdge{gates: [_ | _] = gates}, %PipelinePromotion{revised_at: r}) when not is_nil(r) do
    Enum.all?(gates, fn
      %PipelineGate{state: :open} = g ->
        Timex.after?(coalesce(g.updated_at, g.inserted_at), r)
      _ -> false
    end)
  end
  def open?(_, _), do: true

  @doc """
  Whether an edge was promoted after the given dt
  """
  @spec promoted?(PipelineEdge.t, term) :: boolean
  def promoted?(%PipelineEdge{promoted_at: at}, dt) when not is_nil(at),
    do: Timex.after?(at, dt)
  def promoted?(_, _), do: false

  @doc """
  Validate if we've already done the promotion for this stage for pr pipelines
  """
  @spec pr_promoted?(PipelineEdge.t, PipelinePromotion.t) :: boolean
  def pr_promoted?(%PipelineEdge{to: %PipelineStage{context_id: id}}, %PipelinePromotion{context_id: id})
    when is_binary(id), do: true
  def pr_promoted?(_, _), do: false

  @doc """
  Used to check if a pipeline has sent notifications recently
  """
  @spec debounce(binary) :: DateTime.t
  def debounce(id) do
    Console.Cache.cached(@cache, {:pipe_debounce, id}, fn -> Timex.now() end, ttl: @ttl)
  end

  @doc """
  Has this pipeline id had recent notifications delivered
  """
  @spec debounced?(binary) :: boolean
  def debounced?(id) do
    now = Timex.now() # need to compute this first
    Timex.after?(debounce(id), now)
  end

  @doc """
  Fetches all eligible gates for a cluster
  """
  @spec for_cluster(Cluster.t) :: [PipelineGate.t]
  def for_cluster(%Cluster{id: id}) do
    PipelineGate.for_cluster(id)
    |> PipelineGate.for_agent()
    |> PipelineGate.pending()
    |> Repo.all()
  end

  @doc """
  If a user has pipeline write access, will approvate and open the given gate
  """
  @spec approve_gate(binary, User.t) :: gate_resp
  def approve_gate(id, %User{} = user) do
    get_gate!(id)
    |> Repo.preload([edge: :pipeline])
    |> PipelineGate.changeset(%{state: :open, approver_id: user.id})
    |> allow(user, :approve)
    |> when_ok(:update)
    |> notify(:approve, user)
  end

  @doc """
  An update to a gate's status, to be called from w/in a deployment agent
  """
  @spec update_gate(map, binary, Cluster.t) :: gate_resp
  def update_gate(attrs, id, %Cluster{} = cluster) do
    get_gate!(id)
    |> PipelineGate.update_changeset(attrs)
    |> allow(cluster, :update)
    |> when_ok(:update)
    |> notify(:update)
  end

  @doc """
  If a user has pipeline write access, will force open a gate
  """
  @spec force_gate(atom, binary, User.t) :: gate_resp
  def force_gate(state \\ :open, id, %User{} = user) do
    get_gate!(id)
    |> Repo.preload([edge: :pipeline])
    |> PipelineGate.changeset(%{state: state})
    |> allow(user, :write)
    |> when_ok(:update)
    |> notify(:approve, user)
  end

  @doc """
  Deletes the pipeline by id, if the user has write permisions
  """
  @spec delete(binary, User.t) :: pipeline_resp
  def delete(id, %User{} = user) do
    get_pipeline!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
    |> notify(:delete, user)
  end

  @doc """
  Find preloaded pipeline edges for a given stage
  """
  @spec edges(PipelineStage.t) :: [PipelineEdge.t]
  def edges(%PipelineStage{id: id, pipeline_id: pipe_id}) do
    PipelineEdge.for_pipeline(pipe_id)
    |> PipelineEdge.from_stage(id)
    |> PipelineEdge.preloaded()
    |> Repo.all()
  end

  @doc """
  Takes the healthy services in a stage and builds a promotion from their current revisions.
  If there's any change against the current promotion record, or if this created the promotion,
  we mark it as revised, which can trigger checking if the promotion can be applied.
  """
  @spec build_promotion(PipelineStage.t) :: promotion_resp
  def build_promotion(%PipelineStage{id: id} = stage) do
    preloads = [:context, from_edges: :gates, promotion: [services: :revision], services: [service: :revision]]
    start_transaction()
    |> add_operation(:stage, fn _ ->
      case Repo.preload(stage, preloads) do
        %{from_edges: [_ | _]} = stage -> {:ok, stage}
        _ -> {:error, "this stage has no successors"}
      end
    end)
    |> add_operation(:services, fn %{stage: %{services: svcs}} ->
      Enum.map(svcs, & &1.service)
      |> Enum.filter(& &1.status == :healthy)
      |> Enum.map(& {&1, &1.revision})
      |> Enum.filter(fn {_, r} -> r end)
      |> ok()
    end)
    |> add_operation(:build, fn %{services: svcs, stage: %{promotion: promo} = stage} ->
      old = extant(promo)
            |> Map.drop(Enum.map(svcs, fn {%{id: id}, _} -> id end))
            |> Map.values()
            |> Console.mapify() # prior services to promote w/o a healthy revision yet
      # services w/ a new healthy revision
      new = Enum.map(svcs, fn {%{id: id, sha: sha}, %{id: rid}} -> %{service_id: id, revision_id: rid, sha: sha} end)
      case promo do
        nil -> %PipelinePromotion{stage_id: id}
        %PipelinePromotion{} = promo -> promo
      end
      |> PipelinePromotion.changeset(add_revised(%{services: stabilize_promo(old ++ new, promo)}, legacy_diff?(stage, svcs, promo)))
      |> PipelinePromotion.changeset(%{context_id: stage.context_id})
      |> Repo.insert_or_update()
    end)
    |> add_operation(:revised, fn %{build: promo, services: svcs, stage: stage} ->
      PipelinePromotion.changeset(promo, add_revised(%{}, diff?(stage, svcs, promo)))
      |> Repo.update()
    end)
    |> add_operation(:gates, fn
      %{stage: %{id: id}, revised: %{revised: true}} ->
        PipelineGate.for_stage(id)
        |> PipelineGate.selected()
        |> Repo.update_all(set: [state: :pending, approver_id: nil, updated_at: Timex.now()])
        |> elem(1)
        |> send_updates()
        |> ok()
      _ -> {:ok, 0}
    end)
    |> execute(extract: :revised)
    |> notify(:create)
  end

  @doc """
  Finds all associated stages and promotes the changes according to the configured promotion criteria. If
  all edges were processed, the promotion record is marked as having been promoteds
  """
  @spec apply_promotion(PipelinePromotion.t) :: promotion_resp
  def apply_promotion(%PipelinePromotion{} = promo) do
    start_transaction()
    |> add_operation(:promo, fn _ -> {:ok, Repo.preload(promo, [:stage, services: [:service, :revision]])} end)
    |> add_operation(:edges, fn %{promo: %{stage: stage}} -> {:ok, edges(stage)} end)
    |> add_operation(:resolve, fn %{promo: promotion, edges: edges} ->
      Enum.filter(edges, &open?(&1, promotion))
      |> Enum.filter(& !promoted?(&1, promotion.revised_at)) # don't drive promotion for edge if it's promoted_at is later than the revised_at of promotion
      |> Enum.filter(& !pr_promoted?(&1, promotion)) # don't drive promotion if contexts are equal
      |> Enum.reduce(start_transaction(), &promote_edge(&2, promotion, &1))
      |> execute()
    end)
    |> add_operation(:finish, fn %{promo: promo, resolve: res, edges: edges} ->
      resolved = Enum.filter(res, fn
                   {{:promote, _}, _} -> true
                   _ -> false
                 end)
                 |> Map.new(fn {{:promote, edge_id}, _} -> {edge_id, true} end)

      case Enum.all?(edges, & promoted?(&1, promo.revised_at) || resolved[&1.id]) do
        true ->
          PipelinePromotion.changeset(promo, %{
            applied_context_id: promo.context_id,
            promoted_at: Timex.now()
          })
          |> Repo.update()
        _ -> {:ok, promo}
      end
    end)
    |> execute()
    |> flush_context_events(fn %{resolve: resolve} ->
      Enum.filter(resolve, fn
        {{:ctx, _}, _} -> true
        _ -> false
      end)
      |> Enum.map(fn {_, stage} -> stage end)
    end, :finish)
  end

  defp entry_stages(%Pipeline{stages: stages, edges: edges}) when is_list(stages) and is_list(edges) do
    destinations = MapSet.new(edges, & &1.to_id)
    Enum.filter(stages, & !MapSet.member?(destinations, &1.id))
  end
  defp entry_stages(_), do: []

  defp promote_edge(xact, promotion, %PipelineEdge{to: %PipelineStage{services: [_ | _] = svcs} = stage} = edge) do
    by_id = Map.new(promotion.services, & {&1.service_id, &1})
    Enum.reduce(svcs, xact, fn
      %{criteria: %{source_id: source}} = svc, xact when is_binary(source) ->
        add_operation(xact, {edge.id, svc.id}, fn _ ->
          case by_id[source] do
            nil -> {:ok, nil}
            %{revision: revision} -> promote_service(revision, svc)
          end
        end)
      _, xact -> xact
    end)
    |> add_operation({:ctx, edge.id}, fn _ ->
      case promotion.context_id do
        ctx_id when is_binary(ctx_id) -> create_context_binding(ctx_id, stage)
        _ -> {:ok, stage}
      end
    end)
    |> add_operation({:promote, edge.id}, fn _ ->
      PipelineEdge.changeset(edge, %{promoted_at: Timex.now()})
      |> Repo.update()
    end)
  end
  defp promote_edge(xact, _, _), do: xact

  defp promote_service(%Revision{sha: sha} = rev, %StageService{service_id: id} = ss) do
    with {:ok, configs} <- configs(rev, ss) do
      Map.merge(%{
        git: rev.git && %{ref: sha || rev.git.ref, folder: rev.git.folder},
        helm: rev.helm && %{version: rev.helm.version, chart: rev.helm.chart}
      }, configs)
      |> Services.update_service(id)
    end
  end

  defp configs(%Revision{} = rev, %StageService{service: %Service{} = svc, criteria: %PromotionCriteria{secrets: [_ | _] = secrets}}) do
    with {:ok, new} <- Services.configuration(rev),
         {:ok, base} <- Services.configuration(svc) do
      config = Enum.map(secrets, & %{name: &1, value: new[&1]})
               |> Enum.filter(& &1.value)
      {:ok, %{configuration: Services.merge_configuration(base, config)}}
    end
  end
  defp configs(_, _), do: {:ok, %{}}

  defp extant(%PipelinePromotion{services: [_ | _] = promos}),
    do: Map.new(promos, & {&1.service_id, &1})
  defp extant(_), do: %{}

  defp add_revised(attrs, true), do: Map.merge(attrs, %{revised_at: Timex.now(), revised: true})
  defp add_revised(attrs, _), do: attrs

  defp diff?(_, [], _), do: false

  defp diff?(%PipelineStage{context_id: id}, _, %PipelinePromotion{applied_context_id: id})
    when is_binary(id), do: false

  defp diff?(%PipelineStage{context: %PipelineContext{inserted_at: at}} = promos, _, %PipelinePromotion{} = next) do
    Repo.preload(next, [services: :revision], force: true)
    |> Map.get(:services)
    |> Enum.all?(&Timex.after?(coalesce(&1.revision.updated_at, &1.revision.inserted_at), at)) && gates_stale?(promos)
  end

  defp diff?(_, _, _), do: false

  defp legacy_diff?(_, [], _), do: false
  defp legacy_diff?(_, svcs, %PipelinePromotion{services: [_ | _]} = promo) do
    by_id = extant(promo)
    Enum.any?(svcs, fn {%{sha: sha} = svc, %{id: r}} ->
      case by_id[svc.id] do
        nil -> true
        %PromotionService{revision_id: ^r, sha: ^sha} -> false
        _ -> true
      end
    end)
  end
  defp legacy_diff?(_, _, _), do: true

  defp gates_stale?(%PipelineStage{context: %{inserted_at: at}, from_edges: edges}) do
    Enum.flat_map(edges, & &1.gates)
    |> Enum.all?(&Timex.after?(coalesce(&1.updated_at, &1.inserted_at), at))
  end
  defp gates_stale?(_), do: true

  defp send_updates(gates) do
    Enum.each(gates, &handle_notify(PubSub.PipelineGateUpdated, &1))
    gates
  end

  defp flush_context_events({:ok, result}, mapper, extract) do
    case mapper.(result) do
      [_ | _] = stages -> Enum.each(stages, &handle_notify(PubSub.PipelineStageUpdated, &1))
      %PipelineStage{} = stage -> handle_notify(PubSub.PipelineStageUpdated, stage)
      _ -> :ok
    end
    {:ok, result[extract]}
  end
  defp flush_context_events(err, _, _), do: err

  defp notify({:ok, %PipelinePromotion{} = promo}, :create),
    do: handle_notify(PubSub.PromotionCreated, promo)
  defp notify({:ok, %PipelineStage{} = stage}, :update),
    do: handle_notify(PubSub.PipelineStageUpdated, stage)
  defp notify({:ok, %PipelineEdge{} = edge}, :update),
    do: handle_notify(PubSub.PipelineEdgeUpdated, edge)
  defp notify({:ok, %PipelineGate{} = edge}, :update),
    do: handle_notify(PubSub.PipelineGateUpdated, edge)
  defp notify({:ok, %{stg: %PipelineStage{} = stage}} = res, :context) do
    handle_notify(PubSub.PipelineStageUpdated, stage)
    res
  end
  defp notify(pass, _), do: pass

  defp notify({:ok, %PipelineContext{} = ctx}, :create, user),
    do: handle_notify(PubSub.PipelineContextCreated, ctx, actor: user)

  defp notify({:ok, %Pipeline{} = pipe}, :delete, user),
    do: handle_notify(PubSub.PipelineDeleted, pipe, actor: user)
  defp notify({:ok, %Pipeline{} = pipe}, :create, user),
    do: handle_notify(PubSub.PipelineUpserted, pipe, actor: user)

  defp notify({:ok, %PipelineGate{} = gate}, :approve, user),
    do: handle_notify(PubSub.PipelineGateApproved, gate, actor: user)

  defp notify(pass, _, _), do: pass
end
