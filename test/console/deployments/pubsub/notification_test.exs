defmodule Console.Deployments.PubSub.NotificationsTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.PubSub
  alias Console.Deployments.PubSub.Notifications

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
    end

    test "it can handle an closed pr" do
      pr = insert(:pull_request, status: :closed, url: "https://github.com/pluralsh/console/pulls/1")
      router = insert(:notification_router, events: ["pr.close"])
      insert(:router_sink, router: router)
      insert(:router_filter, router: router, regex: ".*/pluralsh/console/.*")
      expect(HTTPoison, :post, fn _, _, _ -> {:ok, %HTTPoison.Response{}} end)

      event = %PubSub.PullRequestUpdated{item: pr}
      :ok = Notifications.handle_event(event)
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
  end
end
