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

    test "if the ignore actor is given, it won't broadcast" do
      svc = insert(:service)
      event = %PubSub.ServiceUpdated{item: svc, actor: :ignore}
      :ignore = Broadcast.handle_event(event)
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

  describe "ServiceDependenciesUpdated" do
    test "it will push a service.event event" do
      %{id: id} = cluster = insert(:cluster)
      %{service: %{id: dep1_id}} = dep1 = insert(:service_dependency, service: insert(:service, cluster: cluster))
      %{service: %{id: dep2_id}} = dep2 = insert(:service_dependency, service: insert(:service, cluster: cluster))
      expect(Phoenix.Channel.Server, :broadcast, fn Console.PubSub, "cluster:" <> ^id, "service.event", %{"id" => ^dep1_id} -> :ok end)
      expect(Phoenix.Channel.Server, :broadcast, fn Console.PubSub, "cluster:" <> ^id, "service.event", %{"id" => ^dep2_id} -> :ok end)

      event = %PubSub.ServiceDependenciesUpdated{item: [dep1, dep2]}
      Broadcast.handle_event(event)
    end
  end

  describe "ClusterRestoreCreated" do
    test "it will push a restore.event event" do
      %{id: id, backup: %{cluster_id: cluster_id}} = restore = insert(:cluster_restore)
      expect(Phoenix.Channel.Server, :broadcast, fn Console.PubSub, "cluster:" <> ^cluster_id, "restore.event", %{"id" => ^id} -> :ok end)

      event = %PubSub.ClusterRestoreCreated{item: restore}
      Broadcast.handle_event(event)
    end
  end

  describe "PipelineGateUpdated" do
    test "job gates send events" do
      %{id: id} = cluster = insert(:cluster)
      %{id: gate_id} = gate = insert(:pipeline_gate, type: :job, cluster: cluster)
      expect(Phoenix.Channel.Server, :broadcast, fn Console.PubSub, "cluster:" <> ^id, "gate.event", %{"id" => ^gate_id} -> :ok end)

      event = %PubSub.PipelineGateUpdated{item: gate}
      Broadcast.handle_event(event)
    end
  end

  describe "StackRunCreated" do
    test "it will push a stack.run.event event" do
      %{id: id, cluster_id: cluster_id} = run = insert(:stack_run)
      expect(Phoenix.Channel.Server, :broadcast, fn Console.PubSub, "cluster:" <> ^cluster_id, "stack.run.event", %{"id" => ^id} -> :ok end)

      event = %PubSub.StackRunCreated{item: run}
      Broadcast.handle_event(event)
    end
  end

  describe "StackRunUpdated" do
    test "it will push a stack.run.event event" do
      %{id: id, cluster_id: cluster_id} = run = insert(:stack)
      expect(Phoenix.Channel.Server, :broadcast, fn Console.PubSub, "cluster:" <> ^cluster_id, "stack.run.event", %{"id" => ^id} -> :ok end)

      event = %PubSub.StackRunUpdated{item: run}
      Broadcast.handle_event(event)
    end
  end

  describe "StackRunDeleted" do
    test "it will push a stack.run.event event" do
      %{id: id, cluster_id: cluster_id} = run = insert(:stack)
      expect(Phoenix.Channel.Server, :broadcast, fn Console.PubSub, "cluster:" <> ^cluster_id, "stack.run.event", %{"id" => ^id} -> :ok end)

      event = %PubSub.StackRunDeleted{item: run}
      Broadcast.handle_event(event)
    end
  end
end
