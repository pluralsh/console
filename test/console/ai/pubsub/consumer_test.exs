defmodule Console.AI.PubSub.ConsumerTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.AI.Memoizer
  alias Console.AI.PubSub.Consumer
  alias Console.PubSub

  setup do
    {:ok, settings: deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_token: "key"}})}
  end

  describe "ServiceUpdated" do
    test "if the service hasn't been updated w/in the interval and is stale/failed, it will run" do
      svc = insert(:service, status: :stale, updated_at: Timex.now() |> Timex.shift(minutes: -30))
      expect(Memoizer, :generate, & {:ok, &1})

      event = %PubSub.ServiceUpdated{item: svc}
      {:ok, res} = Consumer.handle_event(event)

      assert res.id == svc.id
    end

    test "it will not run if the service isn't stable" do
      svc = insert(:service, status: :stale)

      event = %PubSub.ServiceUpdated{item: svc}
      :ok = Consumer.handle_event(event)
    end
  end

  describe "StackRunCompleted" do
    test "if the run is failed, it will run" do
      run = insert(:stack_run, status: :failed)
      expect(Memoizer, :generate, & {:ok, &1})

      event = %PubSub.StackRunCompleted{item: run}
      {:ok, res} = Consumer.handle_event(event)

      assert res.id == run.id
    end

    test "it will not run if the run isn't faield" do
      run = insert(:stack_run, status: :successful)

      event = %PubSub.StackRunCompleted{item: run}
      :ok = Consumer.handle_event(event)
    end
  end

  describe "StackUpdated" do
    test "if the stack is failed, it will run" do
      stack = insert(:stack, status: :failed)
      expect(Memoizer, :generate, & {:ok, &1})

      event = %PubSub.StackUpdated{item: stack}
      {:ok, res} = Consumer.handle_event(event)

      assert res.id == stack.id
    end

    test "it will not stack if the stack isn't faield" do
      stack = insert(:stack, status: :successful)

      event = %PubSub.StackUpdated{item: stack}
      :ok = Consumer.handle_event(event)
    end
  end
end
