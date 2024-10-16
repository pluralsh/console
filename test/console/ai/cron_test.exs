defmodule Console.AI.CronTest do
  use Console.DataCase, async: false
  use Mimic
  import KubernetesScaffolds
  alias Console.PubSub
  alias Console.Deployments.Clusters
  alias Console.AI.Cron

  setup :set_mimic_global

  describe "#services/0" do
    test "it will gather info from all service components and generate" do
      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_key: "key"}})
      service = insert(:service, status: :failed, errors: [%{source: "manifests", error: "some error"}])
      insert(:service_component,
        service: service,
        state: :pending,
        group: "cert-manager.io",
        version: "v1",
        kind: "Certificate",
        namespace: "ns",
        name: "name"
      )
      expect(Clusters, :control_plane, fn _ -> %Kazan.Server{} end)
      expect(Kube.Client, :get_certificate, fn _, _ -> {:ok, certificate("ns")} end)
      expect(Kube.Utils, :run, fn _ -> {:ok, %{items: []}} end)
      expect(Console.AI.OpenAI, :completion, 2, fn _, _ -> {:ok, "openai completion"} end)

      Cron.services()

      %{id: id} = svc = Console.Repo.preload(refetch(service), [:insight, components: :insight])

      assert svc.insight.text

      %{components: [component]} = svc

      assert component.insight.text

      assert_receive {:event, %PubSub.ServiceInsight{item: {%{id: ^id}, _}}}
    end
  end
end
