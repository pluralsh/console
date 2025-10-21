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

  describe "agentMessageDelta" do
    @tag :skip
    test "new messages will broadcast deltas" do
      user = insert(:user)

      runtime = insert(:agent_runtime)
      run     = insert(:agent_run, runtime: runtime, user: user)
      message = insert(:agent_message, agent_run: run)

      {:ok, socket} = establish_socket(user)

      ref = push_doc(socket, """
        subscription AgentMessageDelta($runId: ID!) {
          agentMessageDelta(runId: $runId) {
            delta
            payload {
              id
              message
              role
            }
          }
        }
      """, variables: %{"runId" => run.id})

      assert_reply(ref, :ok, %{subscriptionId: _})

      event = %PubSub.AgentMessageCreated{item: message}
      Rtc.handle_event(event)

      assert_push("subscription:data", %{result: %{data: %{"agentMessageDelta" => delta}}})
      assert delta["delta"]              == "CREATE"
      assert delta["payload"]["id"]      == message.id
      assert delta["payload"]["message"] == message.message
      assert delta["payload"]["role"]    == message.role
    end
  end
end
