defmodule ConsoleWeb.GraphQl.BuildSubscriptionTest do
  use ConsoleWeb.ChannelCase, async: false
  alias Console.{PubSub.Consumers.Rtc, PubSub}
  use Mimic

  describe "buildDelta" do
    test "build create will broadcast deltas" do
      user = insert(:user)
      {:ok, socket} = establish_socket(user)

      ref = push_doc(socket, """
        subscription {
          buildDelta {
            delta
            payload {
              id
              repository
            }
          }
        }
      """)

      assert_reply(ref, :ok, %{subscriptionId: _})

      build = insert(:build)
      event = %PubSub.BuildCreated{item: build}
      Rtc.handle_event(event)

      assert_push("subscription:data", %{result: %{data: %{"buildDelta" => delta}}})
      assert delta["delta"] == "CREATE"
      assert delta["payload"]["id"] == build.id
      assert delta["payload"]["repository"] == build.repository
    end

    test "Build modify will send UPDATE deltas" do
      user = insert(:user)
      Process.whereis(Console.PubSub.Registry)
      {:ok, socket} = establish_socket(user)

      ref = push_doc(socket, """
        subscription {
          buildDelta {
            delta
            payload {
              id
              repository
              status
            }
          }
        }
      """)

      assert_reply(ref, :ok, %{subscriptionId: _})

      build = insert(:build, status: :successful)
      event = %PubSub.BuildSucceeded{item: build}
      Rtc.handle_event(event)

      assert_push("subscription:data", %{result: %{data: %{"buildDelta" => delta}}})
      assert delta["delta"] == "UPDATE"
      assert delta["payload"]["id"] == build.id
      assert delta["payload"]["repository"] == build.repository
      assert delta["payload"]["status"] == "SUCCESSFUL"
    end
  end

  describe "commandDelta" do
    test "command creates send CREATE deltas" do
      build = insert(:build)
      user = insert(:user)
      {:ok, socket} = establish_socket(user)

      ref = push_doc(socket, """
        subscription Delta($buildId: ID!) {
          commandDelta(buildId: $buildId) {
            delta
            payload {
              id
              command
            }
          }
        }
      """, variables: %{"buildId" => build.id})

      assert_reply(ref, :ok, %{subscriptionId: _})

      command = insert(:command, command: "echo 'hello world'", build: build)
      event = %PubSub.CommandCreated{item: command}
      Rtc.handle_event(event)

      assert_push("subscription:data", %{result: %{data: %{"commandDelta" => delta}}})
      assert delta["delta"] == "CREATE"
      assert delta["payload"]["id"] == command.id
      assert delta["payload"]["command"] == "echo 'hello world'"
    end

    test "command completion sends UPDATE deltas" do
      build = insert(:build)
      user = insert(:user)
      {:ok, socket} = establish_socket(user)

      ref = push_doc(socket, """
        subscription Delta($buildId: ID!) {
          commandDelta(buildId: $buildId) {
            delta
            payload {
              id
              exitCode
            }
          }
        }
      """, variables: %{"buildId" => build.id})

      assert_reply(ref, :ok, %{subscriptionId: _})

      command = insert(:command, exit_code: 0, build: build)
      event = %PubSub.CommandCompleted{item: command}
      Rtc.handle_event(event)

      assert_push("subscription:data", %{result: %{data: %{"commandDelta" => delta}}})
      assert delta["delta"] == "UPDATE"
      assert delta["payload"]["id"] == command.id
      assert delta["payload"]["exitCode"] == 0
    end
  end
end
