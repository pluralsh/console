defmodule Console.Logs.TimeTest do
  use ExUnit.Case, async: true
  alias Console.Logs.Time

  defp assert_range({start, stop}, {exp_start, exp_stop}) do
    assert DateTime.compare(start, exp_start) == :eq
    assert DateTime.compare(stop, exp_stop) == :eq
  end

  describe "range/2" do
    test "it uses explicit bounds" do
      aft = ~U[2026-10-01 00:00:00Z]
      bef = ~U[2026-10-01 01:00:00Z]
      assert Time.range(%Time{after: aft, before: bef}) == {aft, bef}
    end

    test "it extends forward from after by the duration" do
      Time.range(%Time{after: "2026-10-01T00:00:00Z", duration: "15m"})
      |> assert_range({~U[2026-10-01 00:00:00Z], ~U[2026-10-01 00:15:00Z]})
    end

    test "it looks back from before by the duration or the default" do
      bef = ~U[2026-10-01 01:00:00Z]
      assert_range(Time.range(%Time{before: bef, duration: "30m"}), {~U[2026-10-01 00:30:00Z], bef})
      assert_range(Time.range(%Time{before: bef}), {~U[2026-10-01 00:00:00Z], bef})
      assert_range(Time.range(%Time{before: bef}, Timex.Duration.from_minutes(5)), {~U[2026-10-01 00:55:00Z], bef})
    end

    test "it looks back from now when unbounded" do
      {start, stop} = Time.range(nil)
      assert DateTime.diff(stop, start, :second) == 3600
      assert DateTime.diff(DateTime.utc_now(), stop, :second) <= 1
    end
  end

  describe "unix nano conversions" do
    test "it round trips datetimes, naive datetimes and iso strings" do
      ns = Time.to_unix_nano(~U[2026-10-01 00:00:00Z])
      assert Time.to_unix_nano(~N[2026-10-01 00:00:00]) == ns
      assert Time.to_unix_nano("2026-10-01T00:00:00Z") == ns
      assert Time.from_unix_nano("#{ns}") == ~U[2026-10-01 00:00:00.000000Z]
    end
  end

  describe "to_seconds/2" do
    test "it parses durations and falls back to the default" do
      assert Time.to_seconds("5m", 60) == 300
      assert Time.to_seconds("bogus", 60) == 60
      assert Time.to_seconds(nil, 60) == 60
    end
  end
end
