defmodule Console.AI.Evidence.ClusterInsightComponentTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.AI.Evidence.Component.Resource
  alias Console.Schema.ClusterInsightComponent

  describe "generate/1 with NotFound errors" do
    test "returns empty list when resource is not found (404)" do
      cluster = insert(:cluster)
      component = insert(:cluster_insight_component, cluster: cluster)

      expect(Resource, :resource, fn _comp, _cluster ->
        {:error, %HTTPoison.Response{status_code: 404, body: "Not Found"}}
      end)

      assert {:ok, []} = Console.AI.Evidence.generate(component)
    end

    test "returns empty list when resource is not found (generic 404)" do
      cluster = insert(:cluster)
      component = insert(:cluster_insight_component, cluster: cluster)

      expect(Resource, :resource, fn _comp, _cluster ->
        {:error, %{status_code: 404}}
      end)

      assert {:ok, []} = Console.AI.Evidence.generate(component)
    end

    test "propagates other errors" do
      cluster = insert(:cluster)
      component = insert(:cluster_insight_component, cluster: cluster)

      expect(Resource, :resource, fn _comp, _cluster ->
        {:error, %HTTPoison.Response{status_code: 500, body: "Internal Server Error"}}
      end)

      assert {:error, _} = Console.AI.Evidence.generate(component)
    end
  end
end
