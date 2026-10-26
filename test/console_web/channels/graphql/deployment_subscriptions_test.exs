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

  describe "infrastructureStackDelta" do
    @stack_delta """
      subscription {
        infrastructureStackDelta {
          delta
          payload { id name status }
        }
      }
    """

    test "stack updates are only delivered to subscribers who can read the stack" do
      reader   = insert(:user)
      group    = insert(:group)
      insert(:group_member, group: group, user: reader)
      outsider = insert(:user)
      stack    = insert(:stack, read_bindings: [%{group_id: group.id}])

      {:ok, reader_socket} = establish_socket(reader)
      {:ok, outsider_socket} = establish_socket(outsider)

      reader_ref = push_doc(reader_socket, @stack_delta)
      assert_reply(reader_ref, :ok, %{subscriptionId: reader_sub})
      outsider_ref = push_doc(outsider_socket, @stack_delta)
      assert_reply(outsider_ref, :ok, %{subscriptionId: outsider_sub})

      Rtc.handle_event(%PubSub.StackUpdated{item: stack})

      assert_push("subscription:data", %{
        subscriptionId: ^reader_sub,
        result: %{data: %{"infrastructureStackDelta" => delta}}
      })
      assert delta["delta"] == "UPDATE"
      assert delta["payload"]["id"] == stack.id
      assert delta["payload"]["name"] == stack.name

      refute_push("subscription:data", %{subscriptionId: ^outsider_sub})
    end

    test "stack run updates broadcast the stack's latest state" do
      reader   = insert(:user)
      outsider = insert(:user)
      stack    = insert(:stack, read_bindings: [%{user_id: reader.id}])
      run      = insert(:stack_run, stack: stack)
      Ecto.Changeset.change(stack, %{status: :running}) |> Console.Repo.update!()

      {:ok, reader_socket} = establish_socket(reader)
      {:ok, outsider_socket} = establish_socket(outsider)

      reader_ref = push_doc(reader_socket, @stack_delta)
      assert_reply(reader_ref, :ok, %{subscriptionId: reader_sub})
      outsider_ref = push_doc(outsider_socket, @stack_delta)
      assert_reply(outsider_ref, :ok, %{subscriptionId: outsider_sub})

      Rtc.handle_event(%PubSub.StackRunUpdated{item: run})

      assert_push("subscription:data", %{
        subscriptionId: ^reader_sub,
        result: %{data: %{"infrastructureStackDelta" => delta}}
      })
      assert delta["delta"] == "UPDATE"
      assert delta["payload"]["id"] == stack.id
      assert delta["payload"]["status"] == "RUNNING"

      refute_push("subscription:data", %{subscriptionId: ^outsider_sub})
    end

    test "detached stacks broadcast deletes" do
      admin = admin_user()
      stack = insert(:stack)

      {:ok, socket} = establish_socket(admin)
      ref = push_doc(socket, @stack_delta)
      assert_reply(ref, :ok, %{subscriptionId: _})

      {:ok, deleted} = Console.Repo.delete(stack)
      Rtc.handle_event(%PubSub.StackDetached{item: deleted})

      assert_push("subscription:data", %{result: %{data: %{"infrastructureStackDelta" => delta}}})
      assert delta["delta"] == "DELETE"
      assert delta["payload"]["id"] == stack.id
    end
  end

  describe "infrastructureStackDelta filtering" do
    alias Console.Deployments.Policies.Rbac

    test "project readers receive deltas for the project's stacks" do
      reader  = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: reader.id}])
      stack   = insert(:stack, project: project)
      other   = insert(:stack)

      sub = subscribe_stacks(reader)

      Rtc.handle_event(%PubSub.StackUpdated{item: stack})
      assert_stack_delta(sub, stack)

      Rtc.handle_event(%PubSub.StackUpdated{item: other})
      refute_push("subscription:data", %{subscriptionId: ^sub})
    end

    test "write bindings imply read access" do
      writer = insert(:user)
      stack  = insert(:stack, write_bindings: [%{user_id: writer.id}])

      sub = subscribe_stacks(writer)

      Rtc.handle_event(%PubSub.StackUpdated{item: stack})
      assert_stack_delta(sub, stack)
    end

    test "global deployment readers receive deltas for every stack" do
      reader = insert(:user)
      deployment_settings(read_bindings: [%{user_id: reader.id}])
      stack = insert(:stack)

      sub = subscribe_stacks(reader)

      Rtc.handle_event(%PubSub.StackUpdated{item: stack})
      assert_stack_delta(sub, stack)
    end

    test "admins receive deltas for every stack" do
      stack = insert(:stack)

      sub = subscribe_stacks(admin_user())

      Rtc.handle_event(%PubSub.StackCreated{item: stack})
      assert_stack_delta(sub, stack, "CREATE")
    end

    test "access tokens without stack scopes are filtered even for admins" do
      admin = admin_user()
      stack = insert(:stack)

      scoped   = subscribe_stacks(admin, ~w(stack.read))
      unscoped = subscribe_stacks(admin, ~w(service.read))

      Rtc.handle_event(%PubSub.StackUpdated{item: stack})

      assert_stack_delta(scoped, stack)
      refute_push("subscription:data", %{subscriptionId: ^unscoped})
    end

    test "events nobody can read are pushed to no one, not even as errors" do
      stack = insert(:stack)
      subscribe_stacks(insert(:user))
      subscribe_stacks(insert(:user))

      Rtc.handle_event(%PubSub.StackUpdated{item: stack})

      refute_push("subscription:data", _)
    end

    test "other subscriptions on a filtered socket keep receiving events" do
      outsider = insert(:user)
      stack    = insert(:stack, read_bindings: [%{user_id: outsider.id}])
      hidden   = insert(:stack)
      step     = insert(:run_step, run: insert(:stack_run, stack: stack))
      logs     = insert(:run_log, step: step)

      {:ok, socket} = establish_socket(outsider)
      stacks_ref = push_doc(socket, @stack_delta)
      assert_reply(stacks_ref, :ok, %{subscriptionId: stacks_sub})
      logs_ref = push_doc(socket, """
        subscription Logs($stepId: ID!) {
          runLogsDelta(stepId: $stepId) { delta payload { id } }
        }
      """, variables: %{"stepId" => step.id})
      assert_reply(logs_ref, :ok, %{subscriptionId: logs_sub})

      Rtc.handle_event(%PubSub.StackUpdated{item: hidden})
      Rtc.handle_event(%PubSub.RunLogsCreated{item: logs})

      assert_push("subscription:data", %{subscriptionId: ^logs_sub})
      refute_push("subscription:data", %{subscriptionId: ^stacks_sub})
    end

    # the test cache never hits, so the one settings read stands in for the single shared-cache
    # lookup made in prod, which must not grow with the number of subscribers
    test "authorizing deliveries only looks up global settings once per event, however many subscribers" do
      readers   = for _ <- 1..3, do: insert(:user)
      outsiders = for _ <- 1..5, do: insert(:user)
      group     = insert(:group)
      for r <- readers, do: insert(:group_member, group: group, user: r)
      stack = insert(:stack, read_bindings: [%{group_id: group.id}])
      deployment_settings()

      reader_subs   = Enum.map(readers, &subscribe_stacks/1)
      outsider_subs = Enum.map(outsiders, &subscribe_stacks/1)

      stack = Rbac.preload(stack)

      handler = "stack-delta-queries-#{inspect(self())}"
      :telemetry.attach(handler, [:console, :repo, :query], &__MODULE__.forward_query/4, self())
      on_exit(fn -> :telemetry.detach(handler) end)

      Absinthe.Subscription.publish(
        ConsoleWeb.Endpoint,
        %{payload: stack, delta: :update},
        infrastructure_stack_delta: "stacks"
      )
      :telemetry.detach(handler)

      assert_received {:repo_query, "SELECT" <> _ = query}
      assert query =~ ~s(FROM "deployment_settings")
      refute_received {:repo_query, _}
      for sub <- reader_subs, do: assert_stack_delta(sub, stack)
      for sub <- outsider_subs, do: refute_push("subscription:data", %{subscriptionId: ^sub})
    end
  end

  describe "subscriptions without delivery policies" do
    test "they are delivered without looking up deployment settings" do
      user  = insert(:user)
      stack = insert(:stack, read_bindings: [%{user_id: user.id}])
      step  = insert(:run_step, run: insert(:stack_run, stack: stack))
      logs  = insert(:run_log, step: step)
      deployment_settings()

      {:ok, socket} = establish_socket(user)
      ref = push_doc(socket, """
        subscription Logs($stepId: ID!) {
          runLogsDelta(stepId: $stepId) { delta payload { id } }
        }
      """, variables: %{"stepId" => step.id})
      assert_reply(ref, :ok, %{subscriptionId: sub})

      handler = "unpolicied-delta-queries-#{inspect(self())}"
      :telemetry.attach(handler, [:console, :repo, :query], &__MODULE__.forward_query/4, self())
      on_exit(fn -> :telemetry.detach(handler) end)

      Absinthe.Subscription.publish(
        ConsoleWeb.Endpoint,
        %{payload: logs, delta: :create},
        run_logs_delta: "steps:#{step.id}"
      )
      :telemetry.detach(handler)

      refute_received {:repo_query, _}
      assert_push("subscription:data", %{subscriptionId: ^sub})
    end
  end

  def forward_query(_event, _measurements, %{query: query}, pid) do
    if self() == pid, do: send(pid, {:repo_query, query})
  end

  defp subscribe_stacks(user, scopes \\ nil) do
    {:ok, socket} = stack_socket(user, scopes)
    ref = push_doc(socket, @stack_delta)
    assert_reply(ref, :ok, %{subscriptionId: sub})
    sub
  end

  defp stack_socket(user, nil), do: establish_socket(user)
  defp stack_socket(user, scopes) do
    {:ok, token, _} = Console.Guardian.encode_and_sign(user, %{"scopes" => scopes})
    {:ok, socket} = connect(ConsoleWeb.UserSocket, %{"token" => "Bearer #{token}"}, connect_info: %{})
    Absinthe.Phoenix.SubscriptionTest.join_absinthe(socket)
  end

  defp assert_stack_delta(sub, stack, delta \\ "UPDATE") do
    assert_push("subscription:data", %{
      subscriptionId: ^sub,
      result: %{data: %{"infrastructureStackDelta" => %{"delta" => ^delta, "payload" => payload}}}
    })
    assert payload["id"] == stack.id
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
