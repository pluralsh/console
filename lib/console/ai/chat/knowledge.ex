defmodule Console.AI.Chat.Knowledge do
  @moduledoc """
  Imitates the Anthropic memory MCP server, but persisted in postgres, and parented by a proper Plural object for retrieval + authz.
  """
  use Console.Services.Base
  alias Console.Schema.{
    Flow,
    KnowledgeEntity,
    KnowledgeObservation,
    KnowledgeRelationship
  }

  @type parent :: Flow.t()
  @type error :: Console.Error.t()
  @type entity_response :: {:ok, KnowledgeEntity.t()} | error
  @type observation_response :: {:ok, KnowledgeObservation.t()} | error
  @type relationship_response :: {:ok, KnowledgeRelationship.t()} | error
  @type count_resp :: {:ok, integer} | error

  def get_relationship(from_id, to_id), do: Repo.get_by(KnowledgeRelationship, from_id: from_id, to_id: to_id)

  @doc """
  Safe fetch of an entity for a given parent
  """
  @spec get_entity(Flow.t(), String.t()) :: {:ok, KnowledgeEntity.t()} | {:error, String.t()}
  def get_entity(%Flow{id: flow_id}, entity_name) do
    case Repo.get_by(KnowledgeEntity, flow_id: flow_id, name: entity_name) do
      %KnowledgeEntity{} = entity -> {:ok, entity}
      nil -> {:error, "no entity found with name #{entity_name}"}
    end
  end

  @doc """
  Compiles a graph from a given search query, including one degree of freedom from all matched entities.
  """
  @spec compile(Ecto.Query.t) :: {[KnowledgeEntity.t], [KnowledgeRelationship.t]}
  def compile(query) do
    results = Repo.all(query)
              |> Repo.preload([:observations, relations: [:from, to: :observations]])

    second_order = Enum.map(results, & &1.relations.to)
    entities     = Enum.uniq_by(results ++ second_order, & &1.id)
    relations    = Enum.map(entities, & &1.relations)

    {entities, relations}
  end

  @doc """
  Creates a new entity for a given parent
  """
  @spec create_entity(parent, map) :: entity_response
  def create_entity(%Flow{id: flow_id}, attrs) do
    %KnowledgeEntity{flow_id: flow_id}
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
    entities = KnowledgeEntity.for_parent(parent) |> Repo.all()
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
