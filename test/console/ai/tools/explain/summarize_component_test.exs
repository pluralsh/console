defmodule Console.AI.Tools.Explain.SummarizeComponentTest do
  use Console.DataCase, async: true
  use Mimic
  import KubernetesScaffolds
  alias Console.AI.Tools.Explain.SummarizeComponent
  alias Console.AI.Tools.Explain.Summary

  describe "implement/1" do
    test "it will summarize a component" do
      deployment_settings(
        logging: %{enabled: true, driver: :elastic, elastic: es_settings()},
        ai: %{
          enabled: true,
          provider: :openai,
          openai: %{access_token: "key"},
        }
      )
      insert(:user, email: "console@plural.sh", roles: %{admin: true})
      service = insert(:service)
      component = insert(:service_component, service: service, version: "v1", group: "apps", kind: "Deployment", namespace: "default", name: "test")

      Console.AI.Tool.context(service: refetch(service))
      expect(Kube.Utils, :run, fn _ -> {:ok, deployment("default", "test")} end)
      expect(Kube.Utils, :run, fn _ -> {:ok, %{items: [event()]}} end)
      expect(Kube.Utils, :run, fn _ -> {:ok, %{items: [pod("test")]}} end)

      expect(Console.AI.Provider, :simple_tool_call, fn _, _, _ -> {:ok, %Summary{summary: "This is a test summary", relevant: true}} end)


      model = %SummarizeComponent{component_id: component.id, prompt: "What is this component?"}
      {:ok, summary} = SummarizeComponent.implement(model)

      assert summary == "This is a test summary"
    end
  end
end
