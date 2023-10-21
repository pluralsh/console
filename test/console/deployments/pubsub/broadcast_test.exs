defmodule Console.Deployments.PubSub.BroadcastTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.PubSub
  alias Console.Deployments.PubSub.Broadcast

  describe "ServiceCreated" do
    test "it will push a service.event event" do
      %{id: id, cluster_id: cluster_id} = service = insert(:service)
      expect(Phoenix.Channel.Server, :broadcast, fn Console.PubSub, "cluster:" <> ^cluster_id, "service.event", %{"id" => ^id} -> :ok end)

      event = %PubSub.ServiceCreated{item: service}
      Broadcast.handle_event(event)
    end
  end

  describe "ServiceUpdated" do
    test "it will push a service.event event" do
      %{id: id, cluster_id: cluster_id} = service = insert(:service)
      expect(Phoenix.Channel.Server, :broadcast, fn Console.PubSub, "cluster:" <> ^cluster_id, "service.event", %{"id" => ^id} -> :ok end)

      event = %PubSub.ServiceUpdated{item: service}
      Broadcast.handle_event(event)
    end
  end

  describe "ServiceDeleted" do
    test "it will push a service.event event" do
      %{id: id, cluster_id: cluster_id} = service = insert(:service)
      expect(Phoenix.Channel.Server, :broadcast, fn Console.PubSub, "cluster:" <> ^cluster_id, "service.event", %{"id" => ^id} -> :ok end)

      event = %PubSub.ServiceDeleted{item: service}
      Broadcast.handle_event(event)
    end
  end
end
