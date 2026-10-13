defmodule Console.AI.MemoizerTest do
  use Console.DataCase, async: false
  use Mimic

  alias Console.AI.Memoizer
  alias Console.Repo
  alias Console.Schema.{Service, ClusterInsightComponent, ServiceComponent}
  alias Console.AI.Tools.Insight

  @base_model "gpt-5.4"
  @tool_model "gpt-5.5"

  setup :set_mimic_global

  describe "generate/1" do
    test "defers polling when the insight is fresh" do
      svc = insert(:service, insight: insert(:ai_insight))

      assert {:ok, _} = Memoizer.generate(svc)

      assert %Service{ai_poll_at: ai_poll_at} = Repo.get(Service, svc.id)
      assert DateTime.after?(ai_poll_at, DateTime.utc_now())
    end

    test "uses the provider base model, not the tool model, when generating an insight" do
      deployment_settings(
        ai: %{
          enabled: true,
          provider: :openai,
          openai: %{
            access_token: "key",
            model: @base_model,
            tool_model: @tool_model
          }
        }
      )

      svc = insert(:service)

      alert =
        insert(:alert,
          state: :firing,
          service: svc,
          insight: build(:ai_insight, text: nil)
        )

      expect(ReqLLM, :generate_text, 2, fn model, _messages, opts ->
        assert model.model == @base_model
        refute model.model == @tool_model

        case Keyword.get(opts, :tool_choice) do
          :required ->
            insight_tool_response(model.model)

          _ ->
            summary_response(model.model)
        end
      end)

      assert {:ok, insight} = Memoizer.generate(alert)
      assert is_binary(insight.text)
      assert is_binary(insight.summary)
    end
  end

  describe "adopt/1" do
    @object %{group: "apps", version: "v1", kind: "Deployment", namespace: "app", name: "api"}

    defp stale(), do: Timex.now() |> Timex.shift(days: -1)

    defp cluster_comp(cluster, attrs \\ []) do
      insert(:cluster_insight_component, Keyword.merge([cluster: cluster] ++ Map.to_list(@object), attrs))
      |> Repo.preload([:cluster, insight: :evidence])
    end

    defp service_comp(svc, attrs \\ []) do
      insert(:service_component, Keyword.merge([service: svc] ++ Map.to_list(@object), attrs))
      |> Repo.preload([insight: :evidence, service: :cluster])
    end

    test "a cluster component adopts the fresh insight of the service component of the same object" do
      cluster = insert(:cluster)
      svc = insert(:service, cluster: cluster)
      insight = insert(:ai_insight, text: "the service insight")
      service_comp(svc, insight: insight)
      comp = cluster_comp(cluster)

      adopted = Memoizer.adopt(comp)

      assert adopted.insight_id == insight.id
      assert adopted.insight.id == insight.id
      assert refetch(comp).insight_id == insight.id
    end

    test "a service component adopts the fresh insight of the cluster component of the same object" do
      cluster = insert(:cluster)
      svc = insert(:service, cluster: cluster)
      insight = insert(:ai_insight, text: "the cluster insight")
      cluster_comp(cluster, insight: insight)
      comp = service_comp(svc)

      adopted = Memoizer.adopt(comp)

      assert adopted.insight_id == insight.id
      assert refetch(comp).insight_id == insight.id
    end

    test "a stale insight of the other component is not adopted" do
      cluster = insert(:cluster)
      svc = insert(:service, cluster: cluster)
      service_comp(svc, insight: insert(:ai_insight, updated_at: stale()))
      comp = cluster_comp(cluster)

      assert Memoizer.adopt(comp).insight_id == nil
    end

    test "an insight of a service on another cluster is not adopted" do
      cluster = insert(:cluster)
      other = insert(:service, cluster: insert(:cluster))
      service_comp(other, insight: insert(:ai_insight))
      comp = cluster_comp(cluster)

      assert Memoizer.adopt(comp).insight_id == nil
    end

    test "a fresh insight of its own is kept" do
      cluster = insert(:cluster)
      svc = insert(:service, cluster: cluster)
      service_comp(svc, insight: insert(:ai_insight, text: "the service insight"))
      own = insert(:ai_insight, text: "its own insight")
      comp = cluster_comp(cluster, insight: own)

      assert Memoizer.adopt(comp).insight_id == own.id
    end

    test "the core group and namespaces match whether they are nil or empty" do
      cluster = insert(:cluster)
      svc = insert(:service, cluster: cluster)
      insight = insert(:ai_insight)
      service_comp(svc, group: nil, kind: "Node", namespace: nil, name: "node-1", insight: insight)
      comp = cluster_comp(cluster, group: "", kind: "Node", namespace: "", name: "node-1")

      assert Memoizer.adopt(comp).insight_id == insight.id
    end

    test "a cluster component is detached from a stale insight it shares, so it does not overwrite it" do
      cluster = insert(:cluster)
      svc = insert(:service, cluster: cluster)
      shared = insert(:ai_insight, text: "service context", updated_at: stale())
      service = service_comp(svc, insight: shared)
      comp = cluster_comp(cluster, insight: shared)

      detached = Memoizer.adopt(comp)

      assert detached.insight_id == nil
      assert refetch(comp).insight_id == nil
      assert refetch(service).insight_id == shared.id
    end
  end

  describe "generate/1 with a peer" do
    test "does not generate an insight the other component already has" do
      reject(&ReqLLM.generate_text/3)
      cluster = insert(:cluster)
      svc = insert(:service, cluster: cluster)
      insight = insert(:ai_insight, text: "the service insight")

      insert(:service_component,
        service: svc, group: "apps", version: "v1", kind: "Deployment", namespace: "app", name: "api", insight: insight
      )
      comp = insert(:cluster_insight_component,
        cluster: cluster, group: "apps", version: "v1", kind: "Deployment", namespace: "app", name: "api"
      )

      assert {:ok, %{id: id}} = Memoizer.generate(comp)
      assert id == insight.id
      assert %ClusterInsightComponent{insight_id: ^id} = Repo.get(ClusterInsightComponent, comp.id)
      assert %ServiceComponent{insight_id: ^id} = Repo.get_by(ServiceComponent, service_id: svc.id)
    end
  end

  defp insight_tool_response(model) do
    Jason.encode!(%{
      object: "response",
      output: [
        %{
          type: "function_call",
          call_id: "call_insight",
          id: "call_insight",
          status: "completed",
          name: Insight.name(),
          arguments:
            Jason.encode!(%{
              "summary" => "summary",
              "root_cause" => "root cause",
              "key_evidence" => ["key evidence"],
              "contextual_observations" => ["contextual observations"]
            })
        }
      ]
    })
    |> ReqLLM.Response.decode_response("openai:#{model}")
  end

  defp summary_response(model) do
    Jason.encode!(%{
      id: "resp_summary",
      object: "response",
      output: [
        %{
          type: "message",
          id: "msg_summary",
          status: "completed",
          role: "assistant",
          content: [%{type: "output_text", text: "brief summary"}]
        }
      ]
    })
    |> ReqLLM.Response.decode_response("openai:#{model}")
  end
end
