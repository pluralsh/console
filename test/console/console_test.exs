defmodule ConsoleTest do
  use ExUnit.Case

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
