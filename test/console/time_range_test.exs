defmodule Console.TimeRangeTest do
  use ExUnit.Case, async: true

  test "floors the start and ceils the end to a duration string's stable grid" do
    start_at = ~U[2026-10-09 12:00:17.123Z]
    end_at = ~U[2026-10-09 13:00:29.999Z]

    assert Console.TimeRange.align_range(start_at, end_at, "15s") ==
             {~U[2026-10-09 12:00:15.000Z], ~U[2026-10-09 13:00:30.000Z]}
  end

  test "accepts integer seconds for Loki and leaves invalid steps unchanged" do
    start_at = ~U[2026-10-09 12:00:17.123Z]
    end_at = ~U[2026-10-09 13:00:29.999Z]

    assert Console.TimeRange.align_range(start_at, end_at, 60) ==
             {~U[2026-10-09 12:00:00.000Z], ~U[2026-10-09 13:01:00.000Z]}

    aligned_end = ~U[2026-10-09 13:01:00.000Z]
    assert Console.TimeRange.align_range(start_at, aligned_end, 60) |> elem(1) == aligned_end
    assert Console.TimeRange.align_range(start_at, end_at, "invalid") == {start_at, end_at}
  end
end
