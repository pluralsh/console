defmodule Console.JSONTest do
  use ExUnit.Case, async: true

  describe "#encode!/2" do
    test "it encodes plain terms and date structs" do
      json = Console.JSON.encode!(%{a: [1, "b", nil], at: ~U[2026-01-01 00:00:00Z]})
      assert Jason.decode!(json) == %{"a" => [1, "b", nil], "at" => "2026-01-01T00:00:00Z"}

      iodata = Console.JSON.encode_to_iodata!(%{a: 1})
      assert IO.iodata_to_binary(iodata) == ~s({"a":1})
    end

    test "it encodes console structs through their Torque.Encoder implementations" do
      line = %Console.Logs.Line{log: "hi", facets: %{"a" => "b"}}
      set = MapSet.new([1])
      taint = %Console.Schema.ClusterNodePool.Taint{key: "k", value: "v", effect: "NoSchedule"}

      decoded = Jason.decode!(Console.JSON.encode!(%{line: line, set: set, taint: taint}))

      assert decoded["line"] == %{"timestamp" => nil, "log" => "hi", "facets" => %{"a" => "b"}}
      assert decoded["set"] == [1]
      assert %{"key" => "k", "value" => "v"} = decoded["taint"]
    end

    test "it raises on structs without an implementation" do
      assert_raise ArgumentError, fn -> Console.JSON.encode!(%{uri: URI.parse("https://plural.sh")}) end
    end
  end

  describe "#decode/1" do
    test "it decodes, and wraps decode errors in an exception" do
      assert Console.JSON.decode(~s({"a":[1,2]})) == {:ok, %{"a" => [1, 2]}}
      assert Console.JSON.decode!(~s({"a":1})) == %{"a" => 1}

      assert {:error, %Console.JSON.DecodeError{}} = Console.JSON.decode("{bad")
      assert_raise Console.JSON.DecodeError, fn -> Console.JSON.decode!("{bad") end
    end
  end
end

defmodule Console.JSON.PostgresTest do
  use Console.DataCase, async: true
  alias Console.JSON.Postgres

  defp roundtrip(value) do
    %{rows: [[result]]} = Console.Repo.query!("SELECT $1::jsonb", [value])
    result
  end

  describe "jsonb through Console.Repo" do
    test "it round trips maps with the same terms Jason produces" do
      value = %{
        "nested" => %{"list" => [1, 2.5, -3, nil, true, "x"], "empty" => %{}},
        "big" => 123_456_789_012_345_678_901_234_567_890,
        "unicode" => "héllo ☃ \u{1F600} \"quoted\"\n",
        "at" => ~U[2026-01-01 00:00:00.123456Z],
        "long" => String.duplicate("a", 200)
      }

      result = roundtrip(value)
      assert result == Jason.decode!(Jason.encode!(value))
      assert result["at"] == "2026-01-01T00:00:00.123456Z"
    end

    test "it decodes postgres-normalized numbers like Jason does" do
      for json <- ~w(1e2 1.50 -0 0.1000000000000000055511151231257827 18446744073709551616) do
        %{rows: [[result]]} = Console.Repo.query!("SELECT '#{json}'::jsonb")
        %{rows: [[text]]} = Console.Repo.query!("SELECT '#{json}'::jsonb::text")
        assert result === Jason.decode!(text)
      end
    end

    test "it encodes schema structs through Console.Schema.Base's Torque.Encoder" do
      ctx = %Console.Schema.TemplateContext{raw: %{"a" => 1}}
      expected = Jason.decode!(Jason.encode!(ctx))

      assert %{"raw" => %{"a" => 1}, "_type" => "template_context"} = roundtrip(%{"ctx" => ctx})["ctx"]
      assert roundtrip(%{"ctx" => ctx})["ctx"] == expected
    end
  end

  describe "#decode!/1" do
    test "it raises on invalid json" do
      assert_raise ArgumentError, fn -> Postgres.decode!("{bad") end
    end
  end
end
