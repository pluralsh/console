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
    test "it can handle an updated service" do
      pr = insert(:pull_request, url: "https://github.com/pluralsh/console/pulls/1")
      router = insert(:notification_router, events: ["pr.create"])
      insert(:router_sink, router: router)
      insert(:router_filter, router: router, regex: ".*/pluralsh/console/.*")
      expect(HTTPoison, :post, fn _, _, _ -> {:ok, %HTTPoison.Response{}} end)

      event = %PubSub.PullRequestCreated{item: pr}
      :ok = Notifications.handle_event(event)
    end
  end
end
