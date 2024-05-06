defmodule ConsoleWeb.GraphQl.DeploymentsSubscriptionTest do
  use ConsoleWeb.ChannelCase, async: false
  alias Console.{PubSub.Consumers.Rtc, PubSub}

  describe "runLogsDelta" do
    test "new logs will broadcast deltas" do
      user = insert(:user)
      stack = insert(:stack, read_bindings: [%{user_id: user.id}])
      run = insert(:stack_run, stack: stack)
      step = insert(:run_step, run: run)
      logs = insert(:run_log, step: step)

      {:ok, socket} = establish_socket(user)

      ref = push_doc(socket, """
        subscription Logs($stepId: ID!) {
          runLogsDelta(stepId: $stepId) {
            delta
            payload {
              id
              logs
            }
          }
        }
      """, variables: %{"stepId" => step.id})

      assert_reply(ref, :ok, %{subscriptionId: _})

      event = %PubSub.RunLogsCreated{item: logs}
      Rtc.handle_event(event)

      assert_push("subscription:data", %{result: %{data: %{"runLogsDelta" => delta}}})
      assert delta["delta"] == "CREATE"
      assert delta["payload"]["id"] == logs.id
      assert delta["payload"]["logs"] == logs.logs
    end
  end
end
