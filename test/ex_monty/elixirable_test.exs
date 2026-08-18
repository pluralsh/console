defmodule ExMonty.ElixirableTest do
  use ExUnit.Case, async: true

  alias ExMonty.Elixirable

  describe "to_elixir/1" do
    test "converts tagged bytes, paths, dates, and naive datetimes" do
      assert Elixirable.to_elixir({:bytes, <<1, 2, 3>>}) == <<1, 2, 3>>
      assert Elixirable.to_elixir({:path, "/scratch/report.json"}) == "/scratch/report.json"
      assert Elixirable.to_elixir({:date, %{year: 2026, month: 5, day: 1}}) == ~D[2026-05-01]

      assert Elixirable.to_elixir(
               {:datetime,
                %{
                  year: 2026,
                  month: 5,
                  day: 1,
                  hour: 14,
                  minute: 30,
                  second: 0,
                  microsecond: 123_456,
                  offset_seconds: nil,
                  tz_name: nil
                }}
             ) == ~N[2026-05-01 14:30:00.123456]
    end

    test "converts aware datetimes while retaining their fixed offset" do
      datetime =
        Elixirable.to_elixir(
          {:datetime,
           %{
             year: 2026,
             month: 5,
             day: 1,
             hour: 14,
             minute: 30,
             second: 0,
             microsecond: 0,
             offset_seconds: -14_400,
             tz_name: "EDT"
           }}
        )

      assert %DateTime{
               time_zone: "EDT",
               zone_abbr: "EDT",
               utc_offset: -14_400,
               std_offset: 0
             } = datetime
    end

    test "converts named tuples and nested values recursively" do
      assert Elixirable.to_elixir(
               {:named_tuple, "Point", [{"created_at", {:date, %{year: 2026, month: 5, day: 1}}}]}
             ) == %{"created_at" => ~D[2026-05-01]}

      assert Elixirable.to_elixir(%{
               "values" => [{:bytes, <<1>>}, MapSet.new([{:path, "/scratch/data"}])]
             }) == %{"values" => [<<1>>, MapSet.new(["/scratch/data"])]}
    end

    test "retains unsupported tagged values while converting their contents" do
      assert Elixirable.to_elixir({:timedelta, %{days: 1, seconds: 2, microseconds: 3}}) ==
               {:timedelta, %{days: 1, seconds: 2, microseconds: 3}}
    end
  end
end
