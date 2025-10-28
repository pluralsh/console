defmodule Console.Deployments.PubSub.NotificationsTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.PubSub
  alias Console.Deployments.PubSub.Notifications

  @text ~s[### Follow-Up on Your Network Issue: Reclaiming the `ingress-nginx-controller` LoadBalancer Service\n\nBased on the current state and additional details regarding the pending status of the `ingress-nginx-controller` service in your Kubernetes cluster (`k3s-test`), it's very clear that the service is not progressing because of a missing external load balancer. This is essentially preventing the completion of your Ingress-Nginx controller setup for managing external ingress traffic.\n\nLet's consolidate the issues and steps you've already outlined, and I'll provide additional context and debugging options:\n\n---\n\n### Key Takeaways:\n\n- The `ingress-nginx-controller` service, set as a **`LoadBalancer`**, is responsible for provisioning an external load balancer to direct traffic from outside your Kubernetes cluster to your ingresses.\n- The service is in a **pending** state, meaning it's waiting for external resources — specifically, an external load balancer — but the resource has not yet been allocated.\n \n### To Troubleshoot the LoadBalancer Pending Issue:\n\n#### 1. **Confirm Cluster Environment**:\n - First, **identify if your Kubernetes cluster is running on bare metal, or in a cloud provider** (AWS, GCP, Azure, etc.). This will help you decide the next steps, such as using a cloud-management load balancer like AWS ELB, or deploying something like **MetalLB** in bare-metal environments.\n\n - If your cluster is on a cloud platform:\n - **Verify that the Kubernetes cloud provider configurations (for the service account) are correct and that the cluster has sufficient permissions** to provision LoadBalancers via the cloud provider's API.\n \n - If it's a bare-metal solution:\n - You may need a software-based provisioning tool like **MetalLB** to handle LoadBalancer services. In such cases, ensure MetalLB is installed and configured properly.\n \n _Command to check pods:_ \n ```bash\n kubectl get pods -n metallb-system\n ```\n\n#### 2. **Inspect LoadBalancer Events & Status**:\n - Detailed **events from the service** can provide clues about where provisioning is failing (permissions, inadequate resources, networking issues, etc.).\n \n _Command to view events:_\n ```bash\n kubectl describe service ingress-nginx-controller -n ingress-nginx\n ```\n\n Look for errors indicating that the required resources (like external IP addresses or load balancers) cannot be allocated.\n\n#### 3. **Network Connectivity and Configuration** (Cloud):\n - **Check cloud provider-specific limits** (i.e., how many public IPs or load balancers you can provision), as well as the permissions required by the Kubernetes cluster to request new load balancers. If limits are exceeded or permissions denied, the cloud provider will fail to establish the external LoadBala...]

  setup :set_mimic_global

  describe "ServiceUpdated" do
    test "it can handle an updated service" do
      svc = insert(:service)
      router = insert(:notification_router, events: ["service.update"])
      insert(:router_sink, router: router)
      insert(:router_filter, router: router, service: svc)
      expect(HTTPoison, :post, fn _, _, _ -> {:ok, %HTTPoison.Response{}} end)

      event = %PubSub.ServiceUpdated{item: svc}
      :ok = Notifications.handle_event(event)
    end

    test "it can deliver to filterless sinks" do
      svc = insert(:service)
      router = insert(:notification_router, events: ["service.update"])
      insert(:router_sink, router: router)
      expect(HTTPoison, :post, fn _, _, _ -> {:ok, %HTTPoison.Response{}} end)

      event = %PubSub.ServiceUpdated{item: svc}
      :ok = Notifications.handle_event(event)
    end

    test "it will properly ignore if event is different" do
      svc = insert(:service)
      %{user: u, group: g} = insert(:group_member)
      router = insert(:notification_router, events: ["service.update"])
      insert(:router_filter, router: router, service: insert(:service))
      sink = insert(:notification_sink,
        type: :plural,
        notification_bindings: [%{group_id: g.id}],
        configuration: %{plural: %{urgent: true}}
      )
      insert(:router_filter, service: svc)
      insert(:router_sink, router: router, sink: sink)

      event = %PubSub.ServiceUpdated{item: svc}
      :ok = Notifications.handle_event(event)

      refute Console.Schema.AppNotification.for_user(u.id)
             |> Console.Repo.exists?()
    end

    test "it will properly create if event is mapped " do
      svc = insert(:service)
      %{user: u, group: g} = insert(:group_member)
      router = insert(:notification_router, events: ["service.update"])
      insert(:router_filter, router: router, service: insert(:service))
      insert(:router_filter, router: router, service: svc)
      sink = insert(:notification_sink,
        type: :plural,
        notification_bindings: [%{group_id: g.id}],
        configuration: %{plural: %{urgent: true}}
      )
      insert(:router_filter, service: svc)
      insert(:router_sink, router: router, sink: sink)

      event = %PubSub.ServiceUpdated{item: svc}
      :ok = Notifications.handle_event(event)

      assert Console.Schema.AppNotification.for_user(u.id)
             |> Console.Repo.exists?()
    end
  end

  describe "PullRequestCreated" do
    test "it can handle an pr create" do
      pr = insert(:pull_request, url: "https://github.com/pluralsh/console/pulls/1")
      router = insert(:notification_router, events: ["pr.create"])
      insert(:router_sink, router: router)
      insert(:router_filter, router: router, regex: ".*/pluralsh/console/.*")
      expect(HTTPoison, :post, fn _, _, _ -> {:ok, %HTTPoison.Response{}} end)

      event = %PubSub.PullRequestCreated{item: pr}
      :ok = Notifications.handle_event(event)

      assert Console.Schema.AppNotification.for_user(pr.author_id)
             |> Console.Repo.exists?()
    end
  end

  describe "PullRequestUpdated" do
    test "it can handle an merged pr" do
      pr = insert(:pull_request, status: :merged, url: "https://github.com/pluralsh/console/pulls/1")
      router = insert(:notification_router, events: ["pr.close"])
      insert(:router_sink, router: router)
      insert(:router_filter, router: router, regex: ".*/pluralsh/console/.*")
      expect(HTTPoison, :post, fn _, _, _ -> {:ok, %HTTPoison.Response{}} end)

      event = %PubSub.PullRequestUpdated{item: pr}
      :ok = Notifications.handle_event(event)

      assert Console.Schema.AppNotification.for_user(pr.author_id)
             |> Console.Repo.exists?()
    end

    test "it can handle an closed pr" do
      pr = insert(:pull_request, status: :closed, url: "https://github.com/pluralsh/console/pulls/1")
      router = insert(:notification_router, events: ["pr.close"])
      insert(:router_sink, router: router)
      insert(:router_filter, router: router, regex: ".*/pluralsh/console/.*")
      expect(HTTPoison, :post, fn _, _, _ -> {:ok, %HTTPoison.Response{}} end)

      event = %PubSub.PullRequestUpdated{item: pr}
      :ok = Notifications.handle_event(event)

      assert Console.Schema.AppNotification.for_user(pr.author_id)
             |> Console.Repo.exists?()
    end
  end

  describe "PipelineGateUpdated" do
    test "it will fire if a pipeline gate is pending" do
      pipe = insert(:pipeline)
      gate = insert(:pipeline_gate, state: :pending, edge: build(:pipeline_edge, pipeline: pipe))
      router = insert(:notification_router, events: ["pipeline.update"])
      insert(:router_sink, router: router)
      insert(:router_filter, router: router, pipeline: pipe)
      expect(HTTPoison, :post, fn _, _, _ -> {:ok, %HTTPoison.Response{}} end)

      event = %PubSub.PipelineGateUpdated{item: gate}
      :ok = Notifications.handle_event(event)
    end
  end

  describe "StackRunCreated" do
    test "it will fire on a stack run" do
      run = insert(:stack_run)
      router = insert(:notification_router, events: ["stack.run"])
      insert(:router_sink, router: router)
      insert(:router_filter, router: router, stack: run.stack)
      me = self()
      expect(HTTPoison, :post, fn _, body, _ ->
        send me, {:body, body}
        {:ok, %HTTPoison.Response{}}
      end)

      event = %PubSub.StackRunCreated{item: run}
      :ok = Notifications.handle_event(event)

      assert_receive {:body, body}

      {:ok, _} = Jason.decode(body)
    end

    test "it will ignore pr based stack runs" do
      run = insert(:stack_run, pull_request: insert(:pull_request))
      router = insert(:notification_router, events: ["stack.run"])
      insert(:router_sink, router: router)
      insert(:router_filter, router: router, stack: run.stack)
      reject(HTTPoison, :post, 3)

      event = %PubSub.StackRunCreated{item: run}
      :ok = Notifications.handle_event(event)
    end
  end

  describe "StackRunUpdated" do
    test "it will fire on a stack run" do
      run = insert(:stack_run, status: :pending_approval)
      router = insert(:notification_router, events: ["stack.pending"])
      insert(:router_sink, router: router)
      insert(:router_filter, router: router, stack: run.stack)
      me = self()
      expect(HTTPoison, :post, fn _, body, _ ->
        send me, {:body, body}
        {:ok, %HTTPoison.Response{}}
      end)

      event = %PubSub.StackRunUpdated{item: run}
      :ok = Notifications.handle_event(event)

      assert_receive {:body, body}

      {:ok, _} = Jason.decode(body)
    end

    test "it will ignore pr based stack runs" do
      run = insert(:stack_run, status: :running)
      router = insert(:notification_router, events: ["stack.pending"])
      insert(:router_sink, router: router)
      insert(:router_filter, router: router, stack: run.stack)
      reject(HTTPoison, :post, 3)

      event = %PubSub.StackRunUpdated{item: run}
      :ok = Notifications.handle_event(event)
    end
  end

  describe "ServiceInsight" do
    test "it can generate a slack message" do
      svc = insert(:service)
      insight = insert(:ai_insight, text: @text)
      router = insert(:notification_router, events: ["service.insight"])
      insert(:router_sink, router: router)
      insert(:router_filter, router: router, service: svc)

      me = self()
      expect(HTTPoison, :post, fn _, body, _ ->
        send me, {:body, body}
        {:ok, %HTTPoison.Response{}}
      end)

      event = %PubSub.ServiceInsight{item: {svc, insight}}
      :ok = Notifications.handle_event(event)

      assert_receive {:body, body}

      {:ok, _} = Jason.decode(body)
    end
  end

  describe "StackInsight" do
    test "it can generate a slack message" do
      stack = insert(:stack)
      insight = insert(:ai_insight, text: @text)
      router = insert(:notification_router, events: ["stack.insight"])
      insert(:router_sink, router: router)
      insert(:router_filter, router: router, stack: stack)

      me = self()
      expect(HTTPoison, :post, fn _, body, _ ->
        send me, {:body, body}
        {:ok, %HTTPoison.Response{}}
      end)

      event = %PubSub.StackInsight{item: {stack, insight}}
      :ok = Notifications.handle_event(event)

      assert_receive {:body, body}

      {:ok, _} = Jason.decode(body)
    end
  end

  describe "ClusterInsight" do
    test "it can generate a slack message" do
      cluster = insert(:cluster)
      insight = insert(:ai_insight, text: @text)
      router = insert(:notification_router, events: ["cluster.insight"])
      insert(:router_sink, router: router)
      insert(:router_filter, router: router, cluster: cluster)

      me = self()
      expect(HTTPoison, :post, fn _, body, _ ->
        send me, {:body, body}
        {:ok, %HTTPoison.Response{}}
      end)

      event = %PubSub.ClusterInsight{item: {cluster, insight}}
      :ok = Notifications.handle_event(event)

      assert_receive {:body, body}

      {:ok, _} = Jason.decode(body)
    end
  end

  describe "AlertCreated" do
    test "it can generate a slack message" do
      cluster = insert(:cluster)
      alert = insert(:alert, cluster: cluster)
      router = insert(:notification_router, events: ["alert.fired"])
      insert(:router_sink, router: router)
      insert(:router_filter, router: router, cluster: cluster)

      me = self()
      expect(HTTPoison, :post, fn _, body, _ ->
        send me, {:body, body}
        {:ok, %HTTPoison.Response{}}
      end)

      event = %PubSub.AlertCreated{item: alert}
      :ok = Notifications.handle_event(event)

      assert_receive {:body, body}

      {:ok, _} = Jason.decode(body)
    end
  end
end
