defmodule Console.Deployments.PubSub.CacheableTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.PubSub
  alias Console.PubSub.Consumers.Cache

  describe "WorkbenchWebhookCreated" do
    test "calls Console.Cache.put with {:wb_webhooks, webhook_id} and the hook" do
      %{id: id} = obs_webhook = insert(:observability_webhook, type: :grafana)
      workbench = insert(:workbench)
      hook =
        insert(:workbench_webhook,
          workbench: workbench,
          webhook: obs_webhook,
          name: "grafana-alerts"
        )

      expect(Console.Cache, :delete, fn {:wb_webhooks, ^id} -> :ok end)

      event = %PubSub.WorkbenchWebhookCreated{item: hook}
      Cache.handle_event(event)
    end
  end

  describe "WorkbenchWebhookUpdated" do
    test "calls Console.Cache.put with {:wb_webhooks, webhook_id} and the hook" do
      %{id: id} = obs_webhook = insert(:observability_webhook, type: :grafana)
      workbench = insert(:workbench)
      hook =
        insert(:workbench_webhook,
          workbench: workbench,
          webhook: obs_webhook,
          name: "updated-webhook"
        )

      expect(Console.Cache, :delete, fn {:wb_webhooks, ^id} -> :ok end)

      event = %PubSub.WorkbenchWebhookUpdated{item: hook}
      Cache.handle_event(event)
    end
  end

  describe "WorkbenchWebhookDeleted" do
    test "calls Console.Cache.put with {:wb_webhooks, webhook_id} and the hook" do
      %{id: id} = obs_webhook = insert(:observability_webhook, type: :grafana)
      workbench = insert(:workbench)
      hook =
        insert(:workbench_webhook,
          workbench: workbench,
          webhook: obs_webhook,
          name: "deleted-webhook"
        )

      expect(Console.Cache, :delete, fn {:wb_webhooks, ^id} -> :ok end)

      event = %PubSub.WorkbenchWebhookDeleted{item: hook}
      Cache.handle_event(event)
    end
  end
end
