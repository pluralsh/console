defmodule ConsoleWeb.GraphQl.DevboxSubscriptionsTest do
  use ConsoleWeb.ChannelCase, async: false
  alias Console.{PubSub.Consumers.Rtc, PubSub}
  alias Console.Schema.DevboxInstance

  describe "devboxInstanceStatusDelta" do
    test "workbench readers get instance updates by id and by workbench" do
      user = insert(:user)
      wb = insert(:workbench, read_bindings: [%{user_id: user.id}])
      inst = insert(:devbox_instance, workbench: wb)

      {:ok, socket} = establish_socket(user)

      ref = push_doc(socket, """
        subscription Status($workbenchId: ID) {
          devboxInstanceStatusDelta(workbenchId: $workbenchId) { delta payload { id status } }
        }
      """, variables: %{"workbenchId" => wb.id})
      assert_reply(ref, :ok, %{subscriptionId: _})

      Rtc.handle_event(%PubSub.DevboxInstanceUpdated{item: %{inst | status: :suspended}})

      assert_push("subscription:data", %{result: %{data: %{"devboxInstanceStatusDelta" => delta}}})
      assert delta["delta"] == "UPDATE"
      assert delta["payload"]["id"] == inst.id
      assert delta["payload"]["status"] == "SUSPENDED"
    end

    test "users without access can't subscribe" do
      inst = insert(:devbox_instance)
      {:ok, socket} = establish_socket(insert(:user))

      ref = push_doc(socket, """
        subscription Status($id: ID) { devboxInstanceStatusDelta(id: $id) { delta } }
      """, variables: %{"id" => inst.id})

      assert_reply(ref, :error, _)
    end
  end

  describe "devboxThreadDelta" do
    test "thread updates are broadcast per instance" do
      user = insert(:user)
      inst = insert(:devbox_instance, workbench: insert(:workbench, read_bindings: [%{user_id: user.id}]))
      thread = insert(:devbox_instance_session, instance: inst)

      {:ok, socket} = establish_socket(user)

      ref = push_doc(socket, """
        subscription Threads($id: ID!) { devboxThreadDelta(instanceId: $id) { delta payload { id status } } }
      """, variables: %{"id" => inst.id})
      assert_reply(ref, :ok, %{subscriptionId: _})

      Rtc.handle_event(%PubSub.DevboxThreadUpdated{item: thread})

      assert_push("subscription:data", %{result: %{data: %{"devboxThreadDelta" => delta}}})
      assert delta["payload"]["id"] == thread.id
    end
  end

  describe "devboxInstanceDelta" do
    test "live ACP deltas are broadcast per instance" do
      user = insert(:user)
      inst = insert(:devbox_instance, workbench: insert(:workbench, read_bindings: [%{user_id: user.id}]))

      {:ok, socket} = establish_socket(user)

      ref = push_doc(socket, """
        subscription Deltas($id: ID!) {
          devboxInstanceDelta(instanceId: $id) { delta payload { instanceId sessionId op payload offset } }
        }
      """, variables: %{"id" => inst.id})
      assert_reply(ref, :ok, %{subscriptionId: _})

      Rtc.handle_event(%PubSub.DevboxInstanceDeltaCreated{item: %DevboxInstance.Delta{
        instance_id: inst.id,
        session_id: "sess-1",
        op: :append,
        payload: %{"text" => "hi"},
        offset: 7
      }})

      assert_push("subscription:data", %{result: %{data: %{"devboxInstanceDelta" => delta}}})
      assert delta["payload"]["instanceId"] == inst.id
      assert delta["payload"]["op"] == "APPEND"
      assert delta["payload"]["payload"] == %{"text" => "hi"}
      assert delta["payload"]["offset"] == "7"
    end

    test "a pushed batch reaches subscribers in order" do
      user = insert(:user)
      inst = insert(:devbox_instance, workbench: insert(:workbench, read_bindings: [%{user_id: user.id}]))

      {:ok, socket} = establish_socket(user)

      ref = push_doc(socket, """
        subscription Deltas($id: ID!) { devboxInstanceDelta(instanceId: $id) { payload { offset seq stream } } }
      """, variables: %{"id" => inst.id})
      assert_reply(ref, :ok, %{subscriptionId: _})

      offsets = Enum.to_list(1..50)
      deltas = Enum.map(offsets, &%{instance_id: inst.id, session_id: "s", entity_id: "e", op: :DELTA_OP_APPEND, offset: &1, seq: &1, stream: "run-1"})
      :ok = Console.Devboxes.Ingest.publish_instance_deltas(deltas, inst.devbox.cluster)

      received = for _ <- offsets do
        assert_push("subscription:data", %{result: %{data: %{"devboxInstanceDelta" => %{"payload" => %{"offset" => o, "seq" => s, "stream" => "run-1"}}}}})
        assert s == o
        String.to_integer(o)
      end
      assert received == offsets
    end
  end

  describe "devboxInstanceIndexDelta" do
    test "index changes are broadcast per instance" do
      user = insert(:user)
      inst = insert(:devbox_instance, workbench: insert(:workbench, read_bindings: [%{user_id: user.id}]))
      interaction = insert(:devbox_instance_interaction, instance: inst)

      {:ok, socket} = establish_socket(user)

      ref = push_doc(socket, """
        subscription Index($id: ID!) {
          devboxInstanceIndexDelta(instanceId: $id) { payload { instanceId revision interactions { id } } }
        }
      """, variables: %{"id" => inst.id})
      assert_reply(ref, :ok, %{subscriptionId: _})

      Rtc.handle_event(%PubSub.DevboxInstanceIndexUpdated{item: %DevboxInstance.IndexDelta{
        instance_id: inst.id,
        revision: 3,
        interactions: [interaction]
      }})

      assert_push("subscription:data", %{result: %{data: %{"devboxInstanceIndexDelta" => delta}}})
      assert delta["payload"]["revision"] == "3"
      assert delta["payload"]["interactions"] == [%{"id" => interaction.id}]
    end
  end

  describe "devboxSnapshotDelta" do
    test "snapshot updates are broadcast per workbench" do
      user = insert(:user)
      wb = insert(:workbench, read_bindings: [%{user_id: user.id}])
      snapshot = insert(:devbox_snapshot, workbench: wb)

      {:ok, socket} = establish_socket(user)

      ref = push_doc(socket, """
        subscription Snapshots($id: ID!) { devboxSnapshotDelta(workbenchId: $id) { payload { id status } } }
      """, variables: %{"id" => wb.id})
      assert_reply(ref, :ok, %{subscriptionId: _})

      Rtc.handle_event(%PubSub.DevboxSnapshotUpdated{item: snapshot})

      assert_push("subscription:data", %{result: %{data: %{"devboxSnapshotDelta" => delta}}})
      assert delta["payload"]["id"] == snapshot.id
    end
  end
end
