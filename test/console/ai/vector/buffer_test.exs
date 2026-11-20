defmodule Console.AI.Vector.BufferTest do
  use ExUnit.Case, async: true
  alias Console.AI.Vector.Buffer

  defmodule Store do
    defstruct [:pid, :name, :results, max_bytes: 100, max_count: 3]

    def limits(%__MODULE__{max_bytes: b, max_count: c}), do: %{max_bytes: b, max_count: c}
    def size(entry), do: byte_size(entry)

    def conflicts?(_, entries, "del:" <> target), do: target in entries
    def conflicts?(_, _, _), do: false

    def bulk_write(%__MODULE__{pid: pid, name: name, results: results}, entries) do
      result = next_result(results)
      send(pid, {:bulk, name, entries, result})
      result
    end

    defp next_result(nil), do: :ok
    defp next_result(agent), do: Agent.get_and_update(agent, fn [r | rest] -> {r, rest}; [] -> {:ok, []} end)
  end

  setup do
    name = :"vector_buffer_#{System.unique_integer([:positive])}"
    start_supervised!({Buffer, name: name, max_age: 50, min_backoff: 50})
    {:ok, buffer: name, store: %Store{pid: self(), name: :default}}
  end

  test "it holds entries until max_age has passed", %{buffer: buffer, store: store} do
    :ok = Buffer.push(buffer, store, "a")
    :ok = Buffer.push(buffer, store, "b")

    refute_received {:bulk, _, _, _}
    assert_receive {:bulk, :default, ["a", "b"], :ok}, 500
  end

  test "it flushes once max_count is reached", %{buffer: buffer, store: store} do
    for e <- ~w(a b c), do: :ok = Buffer.push(buffer, store, e)

    assert_received {:bulk, :default, ["a", "b", "c"], :ok}
    refute_receive {:bulk, _, _, _}, 100
  end

  test "it flushes before a batch would exceed max_bytes", %{buffer: buffer, store: store} do
    store = %{store | max_bytes: 10}
    :ok = Buffer.push(buffer, store, "aaaaaa")
    :ok = Buffer.push(buffer, store, "bbbbbb")

    assert_received {:bulk, :default, ["aaaaaa"], :ok}
    :ok = Buffer.flush(buffer)
    assert_received {:bulk, :default, ["bbbbbb"], :ok}
  end

  test "it rejects an entry larger than max_bytes", %{buffer: buffer, store: store} do
    store = %{store | max_bytes: 4}
    {:error, msg} = Buffer.push(buffer, store, "too large")

    assert msg =~ "exceeds the 4 byte limit"
    :ok = Buffer.flush(buffer)
    refute_received {:bulk, _, _, _}
  end

  test "it flushes when the configured store changes", %{buffer: buffer, store: store} do
    :ok = Buffer.push(buffer, store, "a")
    :ok = Buffer.push(buffer, %{store | name: :other}, "b")

    assert_received {:bulk, :default, ["a"], :ok}
    :ok = Buffer.flush(buffer)
    assert_received {:bulk, :other, ["b"], :ok}
  end

  test "it flushes before an entry that conflicts with the pending batch", %{buffer: buffer, store: store} do
    :ok = Buffer.push(buffer, store, "a")
    :ok = Buffer.push(buffer, store, "del:b")
    refute_received {:bulk, _, _, _}

    :ok = Buffer.push(buffer, store, "del:a")
    assert_received {:bulk, :default, ["a", "del:b"], :ok}

    :ok = Buffer.flush(buffer)
    assert_received {:bulk, :default, ["del:a"], :ok}
  end

  test "it retries a failed batch in order before later ones", %{buffer: buffer, store: store} do
    {:ok, results} = Agent.start_link(fn -> [{:retry, "unavailable"}] end)
    store = %{store | max_count: 1, results: results}

    :ok = Buffer.push(buffer, store, "a")
    assert_received {:bulk, :default, ["a"], {:retry, "unavailable"}}

    :ok = Buffer.push(buffer, store, "b")
    refute_received {:bulk, _, _, _}

    assert_receive {:bulk, :default, ["a"], :ok}, 500
    assert_receive {:bulk, :default, ["b"], :ok}, 500
  end

  test "flush reports batches still pending retry", %{buffer: buffer, store: store} do
    {:ok, results} = Agent.start_link(fn -> [{:retry, "unavailable"}] end)

    :ok = Buffer.push(buffer, %{store | results: results}, "a")
    {:error, msg} = Buffer.flush(buffer)
    assert msg =~ "1 vector write batches are pending retry"

    :ok = Buffer.flush(buffer)
    assert_received {:bulk, :default, ["a"], :ok}
  end

  test "it drops a batch that fails permanently", %{buffer: buffer, store: store} do
    {:ok, results} = Agent.start_link(fn -> [{:error, "invalid"}] end)
    store = %{store | max_count: 1, results: results}

    :ok = Buffer.push(buffer, store, "a")
    :ok = Buffer.push(buffer, store, "b")

    assert_received {:bulk, :default, ["a"], {:error, "invalid"}}
    assert_received {:bulk, :default, ["b"], :ok}
    refute_receive {:bulk, _, ["a"], _}, 100
  end

  test "it is idle while empty", %{buffer: buffer} do
    :ok = Buffer.flush(buffer)
    refute_receive {:bulk, _, _, _}, 100
  end
end
