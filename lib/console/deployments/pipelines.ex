defmodule Console.Deployments.Pipelines do
  use Console.Services.Base
  import Console.Deployments.Policies
  import Console.Deployments.Pipelines.Stability
  alias Console.PubSub
  alias Console.Deployments.{Services}
  alias Console.Schema.{
    Pipeline,
    PipelineStage,
    PipelineEdge,
    PipelineGate,
    StageService,
    PipelinePromotion,
    PromotionCriteria,
    PromotionService,
    User,
    Revision,
    Service,
    Cluster
  }

  @preload [:read_bindings, :write_bindings, edges: [:gates], stages: [services: :criteria]]

  @type gate_resp :: {:ok, PipelineGate.t} | Console.error
  @type pipeline_resp :: {:ok, Pipeline.t} | Console.error
  @type promotion_resp :: {:ok, PipelinePromotion.t} | Console.error

  def get_pipeline(id), do: Repo.get(Pipeline, id)

  def get_pipeline!(id), do: Repo.get!(Pipeline, id)

  def get_gate!(id), do: Repo.get!(PipelineGate, id)

  def get_pipeline_by_name(name), do: Repo.get_by(Pipeline, name: name)

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
        nil -> %Pipeline{}
      end
      |> ok()
    end)
    |> add_operation(:base, fn %{pipe: pipeline} ->
      attrs = stabilize(pipeline, Map.put(attrs, :name, name))
              |> Map.drop([:edges])
      pipeline
      |> Pipeline.changeset(attrs)
      |> allow(user, (if pipe, do: :write, else: :create))
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
  Whether all promotion gates for this edge are currently open
  """
  @spec open?(PipelineEdge.t) :: boolean
  def open?(%PipelineEdge{gates: [_ | _] = gates}) do
    Enum.all?(gates, fn
      %PipelineGate{state: :open} -> true
      _ -> false
    end)
  end
  def open?(_), do: true

  @doc """
  Whether an edge was promoted after the given dt
  """
  @spec promoted?(PipelineEdge.t, term) :: boolean
  def promoted?(%PipelineEdge{promoted_at: at}, dt) when not is_nil(at),
    do: Timex.after?(at, dt)
  def promoted?(_, _), do: false

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
  end

  @doc """
  If a user has pipeline write access, will force open a gate
  """
  @spec force_gate(binary, User.t) :: gate_resp
  def force_gate(id, %User{} = user) do
    get_gate!(id)
    |> Repo.preload([edge: :pipeline])
    |> PipelineGate.changeset(%{state: :open})
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
    start_transaction()
    |> add_operation(:stage, fn _ ->
      {:ok, Repo.preload(stage, [promotion: [:services], services: [:service]])}
    end)
    |> add_operation(:services, fn %{stage: %{services: svcs}} ->
      Enum.map(svcs, & &1.service)
      |> Enum.filter(& &1.status == :healthy)
      |> Enum.map(& {&1, current_revision(&1)})
      |> Enum.filter(fn {_, r} -> r end)
      |> ok()
    end)
    |> add_operation(:build, fn %{services: svcs, stage: %{promotion: promo}} ->
      old = extant(promo)
            |> Map.drop(Enum.map(svcs, fn {%{id: id}, _} -> id end))
            |> Map.values()
            |> Console.mapify()
      new = Enum.map(svcs, fn {%{id: id}, %{id: rid}} -> %{service_id: id, revision_id: rid} end)
      case promo do
        nil -> %PipelinePromotion{stage_id: id}
        %PipelinePromotion{} = promo -> promo
      end
      |> PipelinePromotion.changeset(add_revised(%{services: old ++ new}, diff?(svcs, promo)))
      |> Repo.insert_or_update()
    end)
    |> add_operation(:gates, fn %{stage: %{id: id}} ->
      PipelineGate.for_stage(id)
      |> Repo.update_all(set: [state: :pending, approver_id: nil])
      |> ok()
    end)
    |> execute(extract: :build)
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
      Enum.filter(edges, &open?/1)
      |> Enum.filter(& !promoted?(&1, promotion.revised_at))
      |> Enum.reduce(start_transaction(), &promote_edge(&2, promotion, &1))
      |> execute()
    end)
    |> add_operation(:finish, fn %{promo: promo, resolve: res, edges: edges} ->
      resolved = Map.new(res, fn {edge, _} -> edge end)
      case Enum.all?(edges, & promoted?(&1, promo.revised_at) || resolved[&1.id]) do
        true ->
          PipelinePromotion.changeset(promo, %{promoted_at: Timex.now()})
          |> Repo.update()
        _ -> {:ok, promo}
      end
    end)
    |> execute(extract: :finish)
  end

  defp promote_edge(xact, promotion, %PipelineEdge{to: %PipelineStage{services: [_ | _] = svcs}} = edge) do
    by_id = Map.new(promotion.services, & {&1.service_id, &1})
    Enum.reduce(svcs, xact, fn
      %{criteria: %{source_id: source}} = svc, xact ->
        add_operation(xact, {edge.id, svc.id}, fn _ ->
          case by_id[source] do
            nil -> {:ok, nil}
            %{revision: revision} -> promote_service(revision, svc)
          end
        end)
      _, xact -> xact
    end)
    |> add_operation({:promote, edge.id}, fn _ ->
      PipelineEdge.changeset(edge, %{promoted_at: Timex.now()})
      |> Repo.update()
    end)
  end
  defp promote_edge(xact, _, _), do: xact

  defp promote_service(%Revision{sha: sha, git: %{folder: f}} = rev, %StageService{service_id: id} = ss) do
    with {:ok, configs} <- configs(rev, ss) do
      Map.merge(%{git: %{ref: sha, folder: f}}, configs)
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

  defp add_revised(attrs, true), do: Map.put(attrs, :revised_at, Timex.now())
  defp add_revised(attrs, _), do: attrs

  defp diff?([], _), do: false
  defp diff?(svcs, %PipelinePromotion{services: [_ | _]} = promo) do
    by_id = extant(promo)
    Enum.any?(svcs, fn {svc, %{id: r}} ->
      case by_id[svc.id] do
        nil -> true
        %PromotionService{revision_id: ^r} -> false
        _ -> true
      end
    end)
  end
  defp diff?(_, _), do: true

  defp current_revision(%Service{sha: sha, id: id}) do
    Revision.for_service(id)
    |> Revision.for_sha(sha)
    |> Revision.limit(1)
    |> Revision.ordered()
    |> Repo.one()
  end

  defp notify({:ok, %PipelinePromotion{} = promo}, :create),
    do: handle_notify(PubSub.PromotionCreated, promo)
  defp notify(pass, _), do: pass

  defp notify({:ok, %Pipeline{} = pipe}, :delete, user),
    do: handle_notify(PubSub.PipelineDeleted, pipe, actor: user)
  defp notify({:ok, %Pipeline{} = pipe}, :create, user),
    do: handle_notify(PubSub.PipelineUpserted, pipe, actor: user)

  defp notify({:ok, %PipelineGate{} = gate}, :approve, user),
    do: handle_notify(PubSub.PipelineGateApproved, gate, actor: user)

  defp notify(pass, _, _), do: pass
end
