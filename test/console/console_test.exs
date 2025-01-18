defmodule ConsoleTest do
  use ExUnit.Case

  describe "#clamp/3" do
    test "it will ensure a value is within a range" do
      assert Console.clamp(1, 5, 10) == 5
      assert Console.clamp(12, 5, 10) == 10
      assert Console.clamp(7, 5, 10) == 7
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
