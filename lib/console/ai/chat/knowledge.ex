defmodule Console.AI.Chat.Knowledge do
  @moduledoc """
  Imitates the Anthropic memory MCP server, but persisted in postgres, and parented by a proper Plural object for retrieval + authz.
  """
  use Console.Services.Base
  alias Console.Schema.{
    Cluster,
    Flow,
    KnowledgeEntity,
    KnowledgeObservation,
    KnowledgeRelationship,
    Service,
    Stack
  }

  @type parent :: Flow.t | Service.t | Stack.t | Cluster.t
  @type error :: Console.error
  @type entity_response :: {:ok, KnowledgeEntity.t()} | error
  @type observation_response :: {:ok, KnowledgeObservation.t()} | error
  @type relationship_response :: {:ok, KnowledgeRelationship.t()} | error
  @type count_resp :: {:ok, integer} | error

  def get_relationship(from_id, to_id), do: Repo.get_by(KnowledgeRelationship, from_id: from_id, to_id: to_id)

  @doc """
  Safe fetch of an entity for a given `parent`
  """
  @spec get_entity(parent, String.t()) :: {:ok, KnowledgeEntity.t()} | {:error, String.t()}
  def get_entity(parent, entity_name) do
    case Repo.get_by(KnowledgeEntity, parent_id(parent) ++ [name: entity_name]) do
      %KnowledgeEntity{} = entity -> {:ok, entity}
      nil -> {:error, "no entity found with name #{entity_name}"}
    end
  end

  @doc """
  Checks if there are even any knowledge entities for a given parent
  """
  @spec exists?(parent) :: boolean
  def exists?(parent) do
    KnowledgeEntity.for_parent(parent)
    |> Repo.exists?()
  end

  defp parent_id(%Flow{id: flow_id}), do: [flow_id: flow_id]
  defp parent_id(%Service{id: svc_id}), do: [service_id: svc_id]
  defp parent_id(%Stack{id: stack_id}), do: [stack_id: stack_id]
  defp parent_id(%Cluster{id: cluster_id}), do: [cluster_id: cluster_id]

  @doc """
  Compiles a graph from a given search query, including one degree of freedom from all matched entities.
  """
  @spec compile(Ecto.Query.t) :: {[KnowledgeEntity.t], [KnowledgeRelationship.t]}
  def compile(query) do
    results = Repo.all(query)
              |> Repo.preload([:observations, relations: [:from, to: :observations]])

    second_order = Enum.flat_map(results, & &1.relations) |> Enum.map(& &1.to)
    entities     = Enum.uniq_by(results ++ second_order, & &1.id)
    relations    = Enum.flat_map(entities, fn
                     %KnowledgeEntity{relations: relations} when is_list(relations) -> relations
                     _ -> []
                   end)
                   |> Enum.uniq_by(& &1.id)

    {entities, relations}
  end

  @doc """
  Creates a new entity for a given parent
  """
  @spec create_entity(parent, map) :: entity_response
  def create_entity(parent, attrs) do
    struct(KnowledgeEntity, parent_id(parent))
    |> KnowledgeEntity.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Deletes an entity for a given parent
  """
  @spec delete_entity(parent, binary) :: entity_response
  def delete_entity(parent, entity_name) do
    with {:ok, entity} <- get_entity(parent, entity_name),
      do: Repo.delete(entity)
  end

  @doc """
  Creates new observations for a given entity
  """
  @spec create_observations(parent, String.t(), [%{observation: binary}]) :: count_resp
  def create_observations(parent, entity_name, observations) do
    with {:ok, entity} <- get_entity(parent, entity_name) do
      attrs = Enum.map(observations, & %{entity_id: entity.id, observation: &1})
              |> Enum.map(&timestamped/1)
      Repo.insert_all(KnowledgeObservation, attrs)
      |> count()
    end
  end

  @doc """
  Deletes observations for a given entity
  """
  @spec delete_observations(parent, binary, [binary]) :: count_resp
  def delete_observations(parent, entity_name, observations) do
    with {:ok, entity} <- get_entity(parent, entity_name) do
      KnowledgeObservation.for_entity(entity.id)
      |> KnowledgeObservation.for_observations(observations)
      |> Repo.delete_all()
      |> count()
    end
  end

  @doc """
  Creates a list of relationships between entities
  """
  @spec create_relationships(parent, [%{from: binary, to: binary}]) :: count_resp
  def create_relationships(parent, relations) do
    entities = KnowledgeEntity.for_parent(parent)
               |> Repo.all()
    by_name = Map.new(entities, fn entity -> {entity.name, entity.id} end)

    # TODO: make this a single DB query instead of in-memory map
    attrs = Enum.map(relations, fn %{from: from, to: to, type: type} ->
      timestamped(%{
        from_id: by_name[from],
        to_id: by_name[to],
        type: type
      })
    end) |> Enum.filter(& &1.from_id && &1.to_id)

    Repo.insert_all(
      KnowledgeRelationship,
      attrs,
      on_conflict: :nothing,
      conflict_target: [:from_id, :to_id, :type]
    )
    |> count()
  end

  @doc """
  Deletes a list of relationships between entities
  """
  @spec delete_relationships(parent, [%{from: binary, to: binary, type: binary}]) :: count_resp
  def delete_relationships(parent, relations) do
    KnowledgeRelationship.for_parent(parent)
    |> KnowledgeRelationship.by_names(relations)
    |> Repo.delete_all()
    |> count()
  end

  defp count({count, _}) when is_integer(count), do: {:ok, count}
end
