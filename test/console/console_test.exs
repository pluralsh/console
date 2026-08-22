defmodule ConsoleTest do
  use ExUnit.Case

  describe "#clamp/3" do
    test "it will ensure a value is within a range" do
      assert Console.clamp(1, 5, 10) == 5
      assert Console.clamp(12, 5, 10) == 10
      assert Console.clamp(7, 5, 10) == 7
    end
  end

  describe "#format_duration/1" do
    test "formats zero seconds" do
      assert Console.format_duration(0) == "0s"
    end

    test "preserves non-zero units below the largest unit" do
      assert Console.format_duration(61) == "1m1s"
      assert Console.format_duration(3_661) == "1h1m1s"
      assert Console.format_duration(90_061) == "1d1h1m1s"
    end

    test "accepts the float seconds returned by Timex durations" do
      assert Console.format_duration(90.0) == "1m30s"
    end
  end

  describe "#handle_rpc/1" do
    test "converts genserver call timeouts into rate limits" do
      reason = {:timeout, {GenServer, :call, [self(), {:digest, :ref}, 10000]}}

      assert Console.handle_rpc({:rpc, reason}) == {:error, :rate_limited}
      assert Console.handle_rpc({:erpc, reason}) == {:error, :rate_limited}
      assert Console.handle_rpc(reason) == {:error, :rate_limited}
      assert Console.handle_rpc(:timeout) == {:error, :rate_limited}
    end

    test "converts noproc errors from erpc into rate limits" do
      reason = {:noproc, {GenServer, :call, [self(), {:digest, :ref}, 10000]}}

      assert Console.handle_rpc({:rpc, reason}) == {:error, :rate_limited}
      assert Console.handle_rpc({:erpc, {:exception, reason}}) == {:error, :rate_limited}
      assert Console.handle_rpc({:exception, reason, []}) == {:error, :rate_limited}
      assert Console.handle_rpc({:error, {:rpc, {:exception, {:norproc, self()}}}}) == {:error, :rate_limited}
      assert Console.handle_rpc(:noproc) == {:error, :rate_limited}
    end

    test "leaves unrelated rpc failures as rpc errors" do
      assert Console.handle_rpc(:noconnection) == {:error, {:rpc, :noconnection}}
      assert Console.handle_rpc({:rpc, :badarg}) == {:error, {:rpc, :badarg}}
      assert Console.handle_rpc({:ok, "sha"}) == {:ok, "sha"}
    end
  end

  describe "#put_path/3" do
    test "it can deep insert a value into a nested map" do
      map = %{
        "cluster-operator" => %{
          "cluster" => %{
            "resources" => %{"requests" => %{"cpu" => "250m"}}
          },
          "monitoring" => %{"namespace" => "monitoring"}
        }
      }

      result = Console.put_path(
        map,
        ["cluster-operator", "cluster", "resources", "requests", "cpu"],
        "100m"
      )

      assert result == %{
        "cluster-operator" => %{
          "cluster" => %{
            "resources" => %{"requests" => %{"cpu" => "100m"}}
          },
          "monitoring" => %{"namespace" => "monitoring"}
        }
      }
    end
  end
end
