defmodule ConsoleWeb.GraphQl.DeploymentsSubscriptionTest do
  use ConsoleWeb.ChannelCase, async: false
  alias Console.{PubSub.Consumers.Rtc, PubSub}
  alias Console.Schema.AgentMessage.Stdout

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
      assert delta["payload"]["role"]    == "USER"
    end

    test "updated messages will broadcast deltas" do
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

      event = %PubSub.AgentMessageUpdated{item: message}
      Rtc.handle_event(event)

      assert_push("subscription:data", %{result: %{data: %{"agentMessageDelta" => delta}}})
      assert delta["delta"]              == "UPDATE"
      assert delta["payload"]["id"]      == message.id
      assert delta["payload"]["message"] == message.message
      assert delta["payload"]["role"]    == "USER"
    end
  end

  describe "agentMessageOutputDelta" do
    test "command output broadcasts to users with access to the agent run" do
      user = insert(:user)
      runtime = insert(:agent_runtime)
      run = insert(:agent_run, runtime: runtime, user: user)
      message = insert(:agent_message, agent_run: run)

      {:ok, socket} = establish_socket(user)

      ref = push_doc(socket, """
        subscription AgentMessageOutputDelta($runId: ID!) {
          agentMessageOutputDelta(runId: $runId) {
            delta
            payload {
              messageId
              agentRunId
              stdout
              stderr
            }
          }
        }
      """, variables: %{"runId" => run.id})

      assert_reply(ref, :ok, %{subscriptionId: _})

      output = %Stdout{
        message_id: message.id,
        agent_run_id: run.id,
        stdout: "command output",
        stderr: "command error"
      }

      Rtc.handle_event(%PubSub.AgentMessageStdoutCreated{item: output})

      assert_push("subscription:data", %{result: %{data: %{"agentMessageOutputDelta" => delta}}})
      assert delta["delta"] == "CREATE"
      assert delta["payload"] == %{
        "messageId" => message.id,
        "agentRunId" => run.id,
        "stdout" => "command output",
        "stderr" => "command error"
      }
    end

    test "users cannot subscribe to another user's agent run output" do
      run = insert(:agent_run, user: insert(:user))
      {:ok, socket} = establish_socket(insert(:user))

      ref = push_doc(socket, """
        subscription AgentMessageOutputDelta($runId: ID!) {
          agentMessageOutputDelta(runId: $runId) {
            payload { stdout }
          }
        }
      """, variables: %{"runId" => run.id})

      assert_reply(ref, :error, %{errors: [%{message: "forbidden"}]})
    end
  end
end
