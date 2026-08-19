defmodule ExMonty.PythonableTest do
  use ExUnit.Case, async: true

  alias ExMonty.Pythonable

  describe "to_python/1" do
    test "preserves scalar values and supported special atoms" do
      assert Pythonable.to_python(nil) == nil
      assert Pythonable.to_python(true) == true
      assert Pythonable.to_python(42) == 42
      assert Pythonable.to_python(1.5) == 1.5
      assert Pythonable.to_python("hello") == "hello"
      assert Pythonable.to_python(:ready) == "ready"
      assert Pythonable.to_python(:ellipsis) == :ellipsis
      assert Pythonable.to_python(:not_implemented) == :not_implemented
      assert Pythonable.to_python(:infinity) == :infinity
      assert Pythonable.to_python(:neg_infinity) == :neg_infinity
      assert Pythonable.to_python(:nan) == :nan
    end

    test "converts nested lists, maps, tuples, and sets recursively" do
      value = %{
        :date => ~D[2026-05-01],
        "items" => [
          {~N[2026-05-01 14:30:00.123456], MapSet.new([~D[2026-05-02], :ready])}
        ]
      }

      assert Pythonable.to_python(value) == %{
               "date" => {:date, %{year: 2026, month: 5, day: 1}},
               "items" => [
                 {{:datetime,
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
                   }}, MapSet.new([{:date, %{year: 2026, month: 5, day: 2}}, "ready"])}
               ]
             }
    end

    test "converts dates and aware datetimes into ExMonty tagged values" do
      datetime = DateTime.from_naive!(~N[2026-05-01 14:30:00.123456], "Etc/UTC")

      assert Pythonable.to_python(~D[2026-05-01]) == {:date, %{year: 2026, month: 5, day: 1}}

      assert Pythonable.to_python(datetime) ==
               {:datetime,
                %{
                  year: 2026,
                  month: 5,
                  day: 1,
                  hour: 14,
                  minute: 30,
                  second: 0,
                  microsecond: 123_456,
                  offset_seconds: 0,
                  tz_name: "UTC"
                }}
    end

    test "preserves ExMonty tagged values while converting their contents" do
      assert Pythonable.to_python({:bytes, <<1, 2, 3>>}) == {:bytes, <<1, 2, 3>>}
      assert Pythonable.to_python({:path, "/tmp/data"}) == {:path, "/tmp/data"}

      assert Pythonable.to_python({:named_tuple, "Point", [{"x", ~D[2026-05-01]}]}) ==
               {:named_tuple, "Point", [{"x", {:date, %{year: 2026, month: 5, day: 1}}}]}

      assert Pythonable.to_python({:file_handle, %{path: "/tmp/data", mode: "r", position: 0}}) ==
               {:file_handle, %{path: "/tmp/data", mode: "r", position: 0}}
    end

    test "converts dataclass fields recursively" do
      dataclass = %ExMonty.Dataclass{
        name: "Job",
        fields: %{"run_at" => ~D[2026-05-01]},
        field_names: ["run_at"]
      }

      assert Pythonable.to_python(dataclass) ==
               %ExMonty.Dataclass{
                 name: "Job",
                 fields: %{"run_at" => {:date, %{year: 2026, month: 5, day: 1}}},
                 field_names: ["run_at"]
               }
    end

    test "requires an explicit implementation for unsupported structs" do
      assert_raise ArgumentError, ~r/implement ExMonty.Pythonable/, fn ->
        Pythonable.to_python(~T[14:30:00])
      end
    end
  end
end
