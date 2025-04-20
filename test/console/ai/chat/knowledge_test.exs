defmodule Console.AI.Chat.KnowledgeTest do
  use Console.DataCase, async: true
  alias Console.AI.Chat.Knowledge
  alias Console.Schema.{
    KnowledgeObservation
  }

  describe "create_entity/2" do
    test "creates an entity" do
      flow = insert(:flow)
      {:ok, entity} = Knowledge.create_entity(flow, %{name: "test_entity", type: "test_type"})
      assert entity.name == "test_entity"
    end
  end

  describe "delete_entity/2" do
    test "deletes an entity" do
      flow = insert(:flow)
      entity = insert(:knowledge_entity, flow: flow)
      insert_list(2, :knowledge_observation, entity: entity)

      {:ok, deleted} = Knowledge.delete_entity(flow, entity.name)

      assert deleted.name == entity.name

      [] = Repo.all(KnowledgeObservation)
    end
  end

  describe "create_observations/3" do
    test "creates observations" do
      flow = insert(:flow)
      entity = insert(:knowledge_entity, flow: flow)
      observations = ["observation1", "observation2"]
      {:ok, 2} = Knowledge.create_observations(flow, entity.name, observations)

      created =  Repo.all(KnowledgeObservation)
      assert length(created) == 2
      assert Enum.all?(created, &MapSet.member?(MapSet.new(observations), &1.observation))
    end
  end

  describe "delete_observations/3" do
    test "deletes observations" do
      flow = insert(:flow)
      entity = insert(:knowledge_entity, flow: flow)
      observations = insert_list(2, :knowledge_observation, entity: entity)
      {:ok, 2} = Knowledge.delete_observations(flow, entity.name, Enum.map(observations, & &1.observation))

      [] = Repo.all(KnowledgeObservation)
    end
  end

  describe "create_relationships/2" do
    test "creates relationships" do
      flow = insert(:flow)
      entity1 = insert(:knowledge_entity, flow: flow)
      entity2 = insert(:knowledge_entity, flow: flow)

      {:ok, 1} = Knowledge.create_relationships(flow, [%{from: entity1.name, to: entity2.name, type: "creates"}])

      assert Knowledge.get_relationship(entity1.id, entity2.id)
    end
  end

  describe "delete_relationships/2" do
    test "deletes relationships" do
      flow = insert(:flow)
      entity1 = insert(:knowledge_entity, flow: flow)
      entity2 = insert(:knowledge_entity, flow: flow)
      relationship = insert(:knowledge_relationship, from: entity1, to: entity2)

      {:ok, 1} = Knowledge.delete_relationships(flow, [%{from: entity1.name, to: entity2.name, type: relationship.type}])

      refute refetch(relationship)
    end
  end
end
