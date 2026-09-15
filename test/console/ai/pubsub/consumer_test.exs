defmodule Console.AI.PubSub.ConsumerTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.AI.Memoizer
  alias Console.AI.PubSub.Consumer
  alias Console.PubSub

  setup do
    {:ok, settings: deployment_settings(ai: %{
      enabled: true,
      provider: :openai,
      openai: %{access_token: "key"}
    })}
  end

  describe "ServiceUpdated" do
    test "if the service hasn't been updated w/in the interval and is stale/failed, it will run" do
      svc = insert(:service,
        status: :stale,
        insight: build(:ai_insight),
        updated_at: Timex.now() |> Timex.shift(minutes: -30)
      )
      expect(Memoizer, :generate, & {:ok, &1.insight})

      event = %PubSub.ServiceUpdated{item: svc}
      {:ok, res} = Consumer.handle_event(event)

      assert res.id == svc.insight.id

      assert_receive {:event, %PubSub.ServiceInsight{item: {s, i}}}

      assert s.id == svc.id
      assert i.id == svc.insight_id
    end

    test "it will not run if the service isn't stable" do
      svc = insert(:service, status: :stale)

      event = %PubSub.ServiceUpdated{item: svc}
      :ok = Consumer.handle_event(event)
    end
  end

  describe "StackRunCompleted" do
    test "if the run is failed, it will run" do
      run = insert(:stack_run,
        status: :failed,
        insight: build(:ai_insight)
      )
      expect(Memoizer, :generate, & {:ok, &1.insight})

      event = %PubSub.StackRunCompleted{item: run}
      {:ok, res} = Consumer.handle_event(event)

      assert res.id == run.insight.id
    end

    test "it will not run if the run isn't faield" do
      run = insert(:stack_run, status: :successful)

      event = %PubSub.StackRunCompleted{item: run}
      :ok = Consumer.handle_event(event)
    end
  end

  describe "StackUpdated" do
    test "if the stack is failed, it will run" do
      stack = insert(:stack,
        status: :failed,
        insight: build(:ai_insight)
      )
      expect(Memoizer, :generate, & {:ok, &1.insight})

      event = %PubSub.StackUpdated{item: stack}
      {:ok, res} = Consumer.handle_event(event)

      assert res.id == stack.insight.id

      assert_receive {:event, %PubSub.StackInsight{item: {s, i}}}
      assert s.id == stack.id
      assert i.id == stack.insight_id
    end

    test "it will not stack if the stack isn't failed" do
      stack = insert(:stack, status: :successful)

      event = %PubSub.StackUpdated{item: stack}
      :ok = Consumer.handle_event(event)
    end
  end

  # describe "AlertCreated" do
  #   test "if the alert is firing, it will run" do
  #     alert = insert(:alert, state: :firing, insight: build(:ai_insight))
  #     expect(Memoizer, :generate, & {:ok, &1.insight})

  #     event = %PubSub.AlertCreated{item: %{alert | state_changed: true}}
  #     {:ok, res} = Consumer.handle_event(event)

  #     assert res.id == alert.insight.id

  #     assert_receive {:event, %PubSub.AlertInsight{item: {a, i}}}
  #     assert a.id == alert.id
  #     assert i.id == alert.insight_id
  #   end

  #   test "it will not stack if the stack isn't faield" do
  #     alert = insert(:alert, state: :resolved)

  #     event = %PubSub.AlertCreated{item: alert}
  #     :ok = Consumer.handle_event(event)
  #   end
  # end
end
