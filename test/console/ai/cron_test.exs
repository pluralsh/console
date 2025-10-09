defmodule Console.AI.CronTest do
  use Console.DataCase, async: false
  use Mimic
  import KubernetesScaffolds
  import ElasticsearchUtils
  alias Console.PubSub
  alias Console.Deployments.Clusters
  alias Kazan.Apis.Core.V1, as: CoreV1
  alias Console.AI.Cron

  setup :set_mimic_global

  describe "#trim_threads/0" do
    test "it will trim threads for users with more than 50" do
      user = insert(:user)
      keep = insert_list(52, :chat_thread, user: user)
      drop = insert_list(3, :chat_thread, user: user, inserted_at: Timex.now() |> Timex.shift(days: -2))
      drop2 = insert_list(2, :chat_thread, last_message_at: Timex.now() |> Timex.shift(days: -30))

      keep2 = insert_list(3, :chat_thread, user: insert(:user), inserted_at: Timex.now() |> Timex.shift(days: -2))

      Cron.trim_threads()

      for t <- keep ++ keep2,
        do: assert refetch(t)

      for t <- drop ++ drop2,
        do: refute refetch(t)
    end
  end

  describe "#trim_mcp_logs/0" do
    test "it will trim mcp logs" do
      old = insert_list(3, :mcp_server_audit, inserted_at: Timex.now() |> Timex.shift(months: -2))
      recent = insert_list(3, :mcp_server_audit)

      Cron.trim_mcp_logs()

      for o <- old, do: refute refetch(o)
      for r <- recent, do: assert refetch(r)
    end
  end

  describe "#services/0" do
    test "it will gather info from all service components and generate" do
      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_token: "key"}})
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
      expect(Kube.Client, :list_certificate_requests, fn _ -> {:ok, %Kube.CertificateRequest.List{items: []}} end)
      expect(Kube.Utils, :run, fn _ -> {:ok, %{items: []}} end)
      expect(Console.AI.OpenAI, :completion, 4, fn _, _, _ -> {:ok, "openai completion"} end)

      Cron.services()

      %{id: id} = svc = Console.Repo.preload(refetch(service), [:insight, components: :insight])

      assert svc.insight.text
      assert svc.ai_poll_at

      %{components: [component]} = svc

      assert component.insight.text

      assert_receive {:event, %PubSub.ServiceInsight{item: {%{id: ^id}, _}}}
    end

    test "it will query log providers when applicable" do
      deployment_settings(
        logging: %{
          enabled: true,
          driver: :elastic,
          elastic: es_settings(),
        },
        ai: %{enabled: true, provider: :openai, openai: %{access_token: "key"}}
      )
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
      expect(Kube.Client, :list_certificate_requests, fn _ -> {:ok, %Kube.CertificateRequest.List{items: []}} end)
      expect(Kube.Utils, :run, fn _ -> {:ok, %{items: []}} end)
      expect(Console.AI.OpenAI, :completion, 4, fn _, _, _ -> {:ok, "openai completion"} end)
      expect(Console.AI.OpenAI, :tool_call, fn _, _, _ ->
        {:ok, [%Console.AI.Tool{name: "logging", arguments: %{required: true}}]}
      end)

      log_document(service, "error what is happening") |> index_doc()
      log_document(service, "another valid log message") |> index_doc()
      refresh()

      Cron.services()

      %{id: id} = svc =
        refetch(service)
        |> Console.Repo.preload([insight: :evidence, components: :insight])

      assert svc.insight.text

      %{components: [component]} = svc

      assert component.insight.text

      %{evidence: [evidence]} = svc.insight
      assert evidence.type == :log
      assert hd(evidence.logs.lines).log == "error what is happening"

      assert_receive {:event, %PubSub.ServiceInsight{item: {%{id: ^id}, _}}}
    end

    test "it will gather info from unknown custom resources and generate" do
      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_token: "key"}})
      service = insert(:service, status: :failed, errors: [%{source: "manifests", error: "some error"}])
      component = insert(:service_component,
        service: service,
        state: :pending,
        group: "elasticsearch.k8s.elastic.com",
        version: "v1",
        kind: "Elasticsearch",
        namespace: "ns",
        name: "name"
      )
      child = insert(:service_component_child,
        uid: Ecto.UUID.generate(),
        component: component,
        state: :pending,
        group: "apps",
        version: "v1",
        kind: "StatefulSet",
        namespace: "ns",
        name: "name"
      )
      expect(Clusters, :control_plane, 2, fn _ -> %Kazan.Server{} end)
      expect(Clusters, :api_discovery, fn  _ -> %{} end)
      expect(Kube.Utils, :run, 2, fn
        %Kazan.Request{path: "/apis/elasticsearch.k8s.elastic.com/v1/namespaces/ns/elasticsearches/name"} -> {:ok, es_cluster("ns")}
        _ -> {:ok, %{items: []}}
      end)
      expect(Console.AI.OpenAI, :completion, 6, fn _, _, _ -> {:ok, "openai completion"} end)

      Cron.services()

      %{id: id} = svc = Console.Repo.preload(refetch(service), [:insight, components: :insight])

      assert svc.insight.text

      %{components: [component]} = svc

      assert component.insight.text

      assert_receive {:event, %PubSub.ServiceInsight{item: {%{id: ^id}, _}}}

      child = Console.Repo.preload(refetch(child), [:insight])
      assert child.insight.text
    end

    test "it will preserve prior insight ids" do
      insight = insert(:ai_insight, updated_at: Timex.now() |> Timex.shift(days: -1))
      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_token: "key"}})
      service = insert(:service, insight: insight, status: :failed, errors: [%{source: "manifests", error: "some error"}])
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
      expect(Kube.Client, :list_certificate_requests, fn _ -> {:ok, %Kube.CertificateRequest.List{items: []}} end)
      expect(Kube.Utils, :run, fn _ -> {:ok, %{items: []}} end)
      expect(Console.AI.OpenAI, :completion, 4, fn _, _, _ -> {:ok, "openai completion"} end)

      Cron.services()

      svc = Console.Repo.preload(refetch(service), [:insight, components: :insight])

      assert svc.insight.text
      assert svc.insight_id == insight.id
    end

    test "it will gather evidence from a statefulset and its pvcs" do
      deployment_settings(
        logging: %{enabled: true, driver: :elastic, elastic: %{host: "localhost", index: "test"}},
        ai: %{enabled: true, provider: :openai, openai: %{access_token: "key"}}
      )

      cluster = insert(:cluster,
        operational_layout: build(:operational_layout,
          namespaces: %{ebs_csi_driver: "aws-ebs-csi-driver"}
        )
      )

      service = insert(:service, cluster: cluster, status: :failed, errors: [%{source: "manifests", error: "some error"}])
      insert(:service_component,
        service: service,
        state: :pending,
        group: "apps",
        version: "v1",
        kind: "StatefulSet",
        namespace: "ns",
        name: "my-sts"
      )

      vct = volume_claim_template("my-vct", "my-sc")
      sts = stateful_set("my-sts", "ns", 1, [vct])
      pvc = persistent_volume_claim("my-vct-my-sts-0", "ns", "my-sc", "my-pv")
      pv = persistent_volume("my-pv")
      sc = storage_class("my-sc", "ebs.csi.aws.com")

      pvc = %{pvc | status: %CoreV1.PersistentVolumeClaimStatus{phase: "Pending"}}

      expect(Clusters, :control_plane, fn _ -> %Kazan.Server{} end)
      expect(Kube.Utils, :run, 6, fn
        %Kazan.Request{path: "/apis/apps/v1/namespaces/ns/statefulsets/my-sts"} -> {:ok, sts}
        %Kazan.Request{path: "/api/v1/namespaces/ns/persistentvolumeclaims/my-vct-my-sts-0"} -> {:ok, pvc}
        %Kazan.Request{path: "/api/v1/persistentvolumes/my-pv"} -> {:ok, pv}
        %Kazan.Request{path: "/apis/storage.k8s.io/v1/storageclasses/my-sc"} -> {:ok, sc}
        _ -> {:ok, %{items: []}}
      end)

      expect(Console.Logs.Provider, :query, 1, fn
        # Updated to expect the specific CSI driver query
        %Console.Logs.Query{
          query: "ebs.csi.aws.com",  # <-- Changed from generic error terms
          namespaces: ["aws-ebs-csi-driver"],
          cluster_id: _
        } ->
          {:ok, [
            %Console.Logs.Line{
              log: "2024-01-01 10:00:00 INFO: CSI driver started",
              timestamp: ~U[2024-01-01 10:00:00Z],
              facets: []
            },
            %Console.Logs.Line{
              log: "2024-01-01 10:01:00 ERROR: Failed to provision volume",
              timestamp: ~U[2024-01-01 10:01:00Z],
              facets: []
            }
          ]}
      end)

      expect(Console.AI.OpenAI, :completion, 4, fn _, _, _ -> {:ok, "openai completion"} end)
      expect(Console.AI.OpenAI, :tool_call, fn _, _, _ ->
        {:ok, [%Console.AI.Tool{name: "logging", arguments: %{required: false}}]}
      end)

      Cron.services()

      %{id: id} = svc = refetch(service) |> Console.Repo.preload([:insight, :components])
      assert svc.insight.text

      [component] = svc.components
      component_insight = Repo.get!(Console.Schema.AiInsight, component.insight_id) |> Repo.preload(:evidence)
      evidence_text = component_insight.evidence
                      |> Stream.filter(&(&1.type == :log))
                      |> Stream.flat_map(&(&1.logs.lines))
                      |> Stream.map(&(&1.log))
                      |> Enum.join("\n")

      assert evidence_text =~ "CSI driver started"
      assert evidence_text =~ "Failed to provision volume"

      assert_receive {:event, %PubSub.ServiceInsight{item: {%{id: ^id}, _}}}
    end
  end

  describe "#clusters/0" do
    test "it will generate insights for failing components" do
      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_token: "key"}})
      cluster = insert(:cluster)
      insert(:cluster_insight_component,
        cluster: cluster,
        group: "cert-manager.io",
        version: "v1",
        kind: "Certificate",
        namespace: "ns",
        name: "name"
      )
      expect(Clusters, :control_plane, fn _ -> %Kazan.Server{} end)
      expect(Kube.Client, :get_certificate, fn _, _ -> {:ok, certificate("ns")} end)
      expect(Kube.Client, :list_certificate_requests, fn _ -> {:ok, %Kube.CertificateRequest.List{items: []}} end)
      expect(Kube.Utils, :run, fn _ -> {:ok, %{items: []}} end)
      expect(Console.AI.OpenAI, :completion, 4, fn _, _, _ -> {:ok, "openai completion"} end)

      Cron.clusters()

      %{id: id} = cluster = Console.Repo.preload(refetch(cluster), [:insight, insight_components: :insight])

      assert cluster.insight.text
      assert cluster.ai_poll_at

      %{insight_components: [component]} = cluster

      assert component.insight.text

      assert_receive {:event, %PubSub.ClusterInsight{item: {%{id: ^id}, _}}}
    end

    test "it can query cert manager logs when needed" do
      deployment_settings(
        logging: %{enabled: true, driver: :elastic, elastic: es_settings()},
        ai: %{enabled: true, provider: :openai, openai: %{access_token: "key"}}
      )
      cluster = insert(:cluster,
        operational_layout: build(:operational_layout,
          namespaces: %{cert_manager: "cert-manager"}
        )
      )
      insert(:cluster_insight_component,
        cluster: cluster,
        group: "cert-manager.io",
        version: "v1",
        kind: "Certificate",
        namespace: "ns",
        name: "name"
      )
      expect(Clusters, :control_plane, fn _ -> %Kazan.Server{} end)
      expect(Kube.Client, :get_certificate, fn _, _ -> {:ok, certificate("ns")} end)
      expect(Kube.Client, :list_certificate_requests, fn _ -> {:ok, %Kube.CertificateRequest.List{items: []}} end)
      expect(Kube.Utils, :run, fn _ -> {:ok, %{items: []}} end)
      expect(Console.AI.OpenAI, :completion, 4, fn _, _, _ -> {:ok, "openai completion"} end)
      expect(Console.AI.OpenAI, :tool_call, fn _, _, _ ->
        {:ok, [%Console.AI.Tool{name: "logging", arguments: %{required: false}}]}
      end)

      log_document(cluster, "cert-manager", "failed no such host") |> index_doc()
      refresh()

      Cron.clusters()

      %{id: id} = cluster =
        refetch(cluster)
        |> Console.Repo.preload([:insight, insight_components: [insight: :evidence]])

      assert cluster.insight.text

      %{insight_components: [component]} = cluster

      assert component.insight.text

      [evidence] = component.insight.evidence

      assert evidence.type == :log
      assert is_binary(evidence.logs.line)

      assert_receive {:event, %PubSub.ClusterInsight{item: {%{id: ^id}, _}}}
    end
  end

  describe "#stacks/0" do
    test "it will gather info from stack runs and generate" do
      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_token: "key"}})
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      stack = insert(:stack, status: :failed, repository: git)
      insert(:stack_run, stack: stack)
      run   = insert(:stack_run, status: :failed, stack: stack, repository: git, git: %{ref: "master", folder: "plural/terraform/aws"})
      step  = insert(:run_step, status: :failed, cmd: "echo", args: ["hello", "work"])
      insert(:run_log, step: step, logs: "blah blah blah")
      expect(Console.AI.OpenAI, :completion, 4, fn _, _, _ -> {:ok, "openai completion"} end)

      Cron.stacks()

      %{id: id} = stack = Console.Repo.preload(refetch(stack), [:insight])

      assert stack.insight.text
      assert stack.ai_poll_at

      run = Console.Repo.preload(refetch(run), [:insight])

      assert run.insight.text

      assert_receive {:event, %PubSub.StackInsight{item: {%{id: ^id}, _}}}
    end
  end

  describe "#alerts/0" do
    test "it will gather info from alerts and generate" do
      deployment_settings(
        logging: %{enabled: true, driver: :elastic, elastic: es_settings()},
        ai: %{enabled: true, provider: :openai, openai: %{access_token: "key"}}
      )
      expect(Console.AI.OpenAI, :completion, 2, fn _, _, _ -> {:ok, "openai completion"} end)
      svc = insert(:service)
      alert = insert(:alert, state: :firing, service: svc)

      log_document(svc, "error what is happening") |> index_doc()
      log_document(svc, "another valid log message") |> index_doc()
      refresh()

      Cron.alerts()

      %{id: id} = alert = refetch(alert) |> Console.Repo.preload([insight: :evidence])

      assert alert.insight.text

      %{evidence: [evidence]} = alert.insight
      assert evidence.type == :log
      assert hd(evidence.logs.lines).log == "error what is happening"

      assert_receive {:event, %PubSub.AlertInsight{item: {%{id: ^id}, _}}}
    end

    test "it will gather extra info from vector stores and generate" do
      deployment_settings(
        logging: %{enabled: true, driver: :elastic, elastic: es_settings()},
        ai: %{
          enabled: true,
          provider: :openai,
          openai: %{access_token: "key"},
          vector_store: %{
            enabled: true,
            store: :elastic,
            elastic: es_vector_settings(),
          },
        }
      )
      %{id: flow_id} = flow = insert(:flow)
      svc = insert(:service, flow: flow)

      expect(Console.AI.OpenAI, :completion, 2, fn _, _, _ -> {:ok, "openai completion"} end)
      expect(Console.AI.OpenAI, :tool_call, fn _, _, _ ->
        {:ok, [%Console.AI.Tool{name: "vector", arguments: %{required: true, query: "some query"}}]}
      end)
      expect(Console.AI.VectorStore, :fetch, fn "some query", [filters: [flow_id: ^flow_id, datatype: {:raw, :pr_file}]] ->
        {:ok, [
          %Console.AI.VectorStore.Response{
            type: :pr,
            pr_file: %Console.Deployments.Pr.File{
              url: "https://github.com/pr/url",
              repo: "some/repo",
              title: "a pr",
              sha: "asdfsa",
              contents: "file contents",
              filename: "example.js",
              patch: "some patch"
            }
          }
        ]}
      end)
      expect(Console.AI.VectorStore, :fetch, fn "some query", _ -> {:ok, []} end)

      alert = insert(:alert, state: :firing, service: svc)

      log_document(svc, "error what is happening") |> index_doc()
      log_document(svc, "another valid log message") |> index_doc()
      refresh()

      Cron.alerts()

      %{id: id} = alert = refetch(alert) |> Console.Repo.preload([insight: :evidence])

      assert alert.insight.text
      assert alert.ai_poll_at

      %{evidence: evidence} = alert.insight
      %{log: [log], pr: [pr]} = Enum.group_by(evidence, & &1.type)
      assert log.type == :log
      assert hd(log.logs.lines).log == "error what is happening"

      assert pr.type == :pr
      assert pr.pull_request.url == "https://github.com/pr/url"
      assert pr.pull_request.repo == "some/repo"
      assert pr.pull_request.title == "a pr"
      assert pr.pull_request.sha == "asdfsa"
      assert pr.pull_request.contents == "file contents"
      assert pr.pull_request.filename == "example.js"
      assert pr.pull_request.patch == "some patch"

      assert_receive {:event, %PubSub.AlertInsight{item: {%{id: ^id}, _}}}
    end
  end
end
