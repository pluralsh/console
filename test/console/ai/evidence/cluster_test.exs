defmodule Console.AI.Evidence.ClusterTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.AI.{Evidence, Memoizer}

  # insights are generated in tasks of their own
  setup :set_mimic_global

  describe "Console.AI.Evidence.Cluster.generate/1" do
    test "reuses the insight of the service managing a failing component" do
      reject(&Memoizer.generate/1)
      cluster = insert(:cluster)
      svc = insert(:service, cluster: cluster)
      insight = insert(:ai_insight, text: "the checkout deployment is crashlooping")

      insert(:service_component,
        service: svc,
        group: "apps",
        version: "v1",
        kind: "Deployment",
        namespace: "payments",
        name: "checkout",
        insight: insight
      )

      insert(:cluster_insight_component,
        cluster: cluster,
        service: svc,
        group: "apps",
        version: "v1",
        kind: "Deployment",
        namespace: "payments",
        name: "checkout"
      )

      {:ok, history, _} =
        cluster
        |> Evidence.preload()
        |> Evidence.generate()

      assert Enum.any?(history, fn {:user, text} -> text =~ "the checkout deployment is crashlooping" end)
    end

    test "does not borrow the insight of a service component that is not the failing one" do
      expect(Memoizer, :generate, fn _ -> {:error, "ai is disabled"} end)
      cluster = insert(:cluster)
      svc = insert(:service, cluster: cluster)

      insert(:service_component,
        service: svc,
        group: "apps",
        version: "v1",
        kind: "Deployment",
        namespace: "payments",
        name: "other",
        insight: insert(:ai_insight, text: "an unrelated insight")
      )

      insert(:cluster_insight_component,
        cluster: cluster,
        service: svc,
        group: "apps",
        version: "v1",
        kind: "Deployment",
        namespace: "payments",
        name: "checkout"
      )

      {:ok, history, _} =
        cluster
        |> Evidence.preload()
        |> Evidence.generate()

      refute Enum.any?(history, fn {:user, text} -> text =~ "an unrelated insight" end)
    end
  end
end
