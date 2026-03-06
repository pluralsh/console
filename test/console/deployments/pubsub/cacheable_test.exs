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

  describe "IssueWebhookCreated" do
    test "calls Console.Cache.delete with {:issue_webhook, external_id}" do
      %{external_id: ext_id} = hook = insert(:issue_webhook, provider: :linear)

      expect(Console.Cache, :delete, fn {:issue_webhook, ^ext_id} -> :ok end)

      event = %PubSub.IssueWebhookCreated{item: hook}
      Cache.handle_event(event)
    end
  end

  describe "IssueWebhookUpdated" do
    test "calls Console.Cache.delete with {:issue_webhook, external_id}" do
      %{external_id: ext_id} = hook = insert(:issue_webhook, provider: :linear)

      expect(Console.Cache, :delete, fn {:issue_webhook, ^ext_id} -> :ok end)

      event = %PubSub.IssueWebhookUpdated{item: hook}
      Cache.handle_event(event)
    end
  end

  describe "IssueWebhookDeleted" do
    test "calls Console.Cache.delete with {:issue_webhook, external_id}" do
      %{external_id: ext_id} = hook = insert(:issue_webhook, provider: :linear)

      expect(Console.Cache, :delete, fn {:issue_webhook, ^ext_id} -> :ok end)

      event = %PubSub.IssueWebhookDeleted{item: hook}
      Cache.handle_event(event)
    end
  end

  describe "ObservabilityWebhookCreated" do
    test "calls Console.Cache.delete with {:obs_webhook, external_id}" do
      %{external_id: ext_id} = hook = insert(:observability_webhook, type: :grafana)

      expect(Console.Cache, :delete, fn {:obs_webhook, ^ext_id} -> :ok end)

      event = %PubSub.ObservabilityWebhookCreated{item: hook}
      Cache.handle_event(event)
    end
  end

  describe "ObservabilityWebhookUpdated" do
    test "calls Console.Cache.delete with {:obs_webhook, external_id}" do
      %{external_id: ext_id} = hook = insert(:observability_webhook, type: :grafana)

      expect(Console.Cache, :delete, fn {:obs_webhook, ^ext_id} -> :ok end)

      event = %PubSub.ObservabilityWebhookUpdated{item: hook}
      Cache.handle_event(event)
    end
  end

  describe "ObservabilityWebhookDeleted" do
    test "calls Console.Cache.delete with {:obs_webhook, external_id}" do
      %{external_id: ext_id} = hook = insert(:observability_webhook, type: :grafana)

      expect(Console.Cache, :delete, fn {:obs_webhook, ^ext_id} -> :ok end)

      event = %PubSub.ObservabilityWebhookDeleted{item: hook}
      Cache.handle_event(event)
    end
  end
end
