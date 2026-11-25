defmodule Console.Prom.TokensTest do
  use Console.DataCase, async: false
  alias Console.Prom.Tokens
  alias Console.Deployments.Agents

  @event ~w(console ai tokens)a

  setup do
    pid = self()
    handler = "tokens-test-#{inspect(make_ref())}"
    :telemetry.attach(handler, @event, fn _, measurements, meta, _ ->
      send(pid, {:tokens, meta, measurements.count})
    end, nil)
    on_exit(fn -> :telemetry.detach(handler) end)
  end

  describe "record/2" do
    test "it emits one event per non-zero token type" do
      Tokens.record(%{input_tokens: 10, output_tokens: 5, cached_tokens: 0, total_tokens: 15}, %{model: "tokens-test"})

      assert_receive {:tokens, %{source: "console", agent: "", model: "tokens-test", type: "input"}, 10}
      assert_receive {:tokens, %{type: "output", model: "tokens-test"}, 5}
      refute_receive {:tokens, %{model: "tokens-test"}, _}
    end

    test "it ignores missing usage" do
      Tokens.record(nil, %{model: "tokens-test"})
      refute_receive {:tokens, %{model: "tokens-test"}, _}
    end
  end

  describe "record_delta/3" do
    test "it emits only the growth of a cumulative usage" do
      Tokens.record_delta(%{input_tokens: 30, output_tokens: 8}, %{input_tokens: 10, output_tokens: 8}, %{model: "tokens-test"})

      assert_receive {:tokens, %{type: "input", model: "tokens-test"}, 20}
      refute_receive {:tokens, %{type: "output", model: "tokens-test"}, _}
    end
  end

  describe "agent runs" do
    test "run updates meter the usage reported since the previous update" do
      cluster = insert(:cluster)
      runtime = insert(:agent_runtime, cluster: cluster, type: :codex)
      run = insert(:agent_run, runtime: runtime)

      {:ok, _} = Agents.update_agent_run(%{usage: %{input_tokens: 100, output_tokens: 20}}, run.id, cluster)
      assert_receive {:tokens, %{source: "agent_run", agent: "codex", type: "input"}, 100}
      assert_receive {:tokens, %{source: "agent_run", agent: "codex", type: "output"}, 20}

      {:ok, _} = Agents.update_agent_run(%{usage: %{input_tokens: 150, output_tokens: 20}}, run.id, cluster)
      assert_receive {:tokens, %{source: "agent_run", type: "input"}, 50}
      refute_receive {:tokens, %{source: "agent_run", type: "output"}, _}
    end
  end

  describe "devbox sessions" do
    test "index upserts meter session usage deltas, skipping imported sessions" do
      inst = insert(:devbox_instance)
      thread = insert(:devbox_instance_session, instance: inst)
      imported = insert(:devbox_instance_session, instance: inst, imported: true)

      {:ok, _} = Console.Devboxes.Ingest.upsert_instance_index(%{
        instance_id: inst.id,
        sessions: [
          %{thread_id: thread.id, revision: 1, usage: %{input_tokens: 40, output_tokens: 10, total_tokens: 50}},
          %{thread_id: imported.id, revision: 1, usage: %{input_tokens: 9_000, total_tokens: 9_000}}
        ]
      }, inst.devbox.cluster)

      assert_receive {:tokens, %{source: "devbox", type: "input"}, 40}
      assert_receive {:tokens, %{source: "devbox", type: "output"}, 10}
      refute_receive {:tokens, %{source: "devbox"}, _}

      {:ok, _} = Console.Devboxes.Ingest.upsert_instance_index(%{
        instance_id: inst.id,
        sessions: [%{thread_id: thread.id, revision: 2, usage: %{input_tokens: 70, output_tokens: 10, total_tokens: 80}}]
      }, inst.devbox.cluster)

      assert_receive {:tokens, %{source: "devbox", type: "input"}, 30}
      refute_receive {:tokens, %{source: "devbox"}, _}
    end
  end
end
