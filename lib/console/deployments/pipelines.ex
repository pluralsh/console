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
    StageService,
    PipelinePromotion,
    PromotionCriteria,
    PromotionService,
    User,
    Revision,
    Service
  }

  @preload [:edges, :read_bindings, :write_bindings, stages: [services: :criteria]]

  @type pipeline_resp :: {:ok, Pipeline.t} | Console.error
  @type promotion_resp :: {:ok, PipelinePromotion.t} | Console.error

  def get_pipeline(id), do: Repo.get(Pipeline, id)

  def get_pipeline!(id), do: Repo.get!(Pipeline, id)

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
      Enum.reduce(edges, start_transaction(), &promote_edge(&2, promotion, &1))
      |> execute()
    end)
    |> add_operation(:finish, fn %{promo: promo} ->
      PipelinePromotion.changeset(promo, %{promoted_at: Timex.now()})
      |> Repo.update()
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
  defp notify(pass, _, _), do: pass
end
