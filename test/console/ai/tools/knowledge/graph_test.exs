defmodule Console.AI.Tools.Knowledge.GraphTest do
  use Console.DataCase, async: true
  alias Console.AI.Tools.Knowledge.Graph

  describe "implement/1" do
    test "it can generate a graph" do
      flow = insert(:flow)
      e1 = insert(:knowledge_entity, flow: flow)
      e2 = insert(:knowledge_entity, flow: flow)
      insert(:knowledge_observation, entity: e1, observation: "test")
      insert(:knowledge_observation, entity: e2, observation: "test")
      insert(:knowledge_relationship, from: e1, to: e2, type: "test")

      Console.AI.Tool.context(%{flow: flow})
      {:ok, res} = Graph.implement(%Graph{query: nil})

      {:ok, %{"entities" => entities, "relationships" => [relationship]}} = Jason.decode(res)

      assert length(entities) == 2
      assert Enum.map(entities, & &1["name"])
             |> unordered_equal?([e1.name, e2.name])

      assert relationship["from"] == e1.name
      assert relationship["to"] == e2.name
      assert relationship["type"] == "test"
    end
  end
end
