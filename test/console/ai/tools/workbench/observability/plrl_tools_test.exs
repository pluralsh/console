defmodule Console.AI.Tools.Workbench.Observability.PlrlToolsTest do
  use ExUnit.Case, async: true

  alias Console.AI.Tool
  alias Console.AI.Tools.Workbench.Observability.Plrl.{
    Logs,
    LogsAggregate,
    LogLabels,
    Metrics,
    MetricsSearch
  }

  describe "Logs (plrl_logs)" do
    test "changeset accepts service_id" do
      assert {:ok, %Logs{service_id: "svc-1"}} =
               Tool.validate(%Logs{}, %{"service_id" => "svc-1", "query" => "error"})
    end

    test "changeset accepts cluster_id" do
      assert {:ok, %Logs{cluster_id: "cluster-1"}} =
               Tool.validate(%Logs{}, %{"cluster_id" => "cluster-1"})
    end

    test "changeset requires service_id or cluster_id" do
      assert {:error, cs} = Tool.validate(%Logs{}, %{"query" => "error"})
      assert Enum.any?(errors_on(cs).service_id, &String.contains?(&1, "One of these fields must be present"))
    end

    test "json_schema loads" do
      assert %{"type" => "object", "properties" => props} = Tool.json_schema(%Logs{})
      assert Map.has_key?(props, "service_id")
    end
  end

  describe "LogsAggregate (plrl_logs_aggregate)" do
    test "changeset accepts service_id" do
      assert {:ok, %LogsAggregate{service_id: "svc-1"}} =
               Tool.validate(%LogsAggregate{}, %{"service_id" => "svc-1"})
    end

    test "changeset requires service_id or cluster_id" do
      assert {:error, _} = Tool.validate(%LogsAggregate{}, %{})
    end
  end

  describe "LogLabels (plrl_logs_facets)" do
    test "changeset accepts cluster_id and field" do
      assert {:ok, %LogLabels{cluster_id: "cluster-1", field: "namespace"}} =
               Tool.validate(%LogLabels{}, %{
                 "cluster_id" => "cluster-1",
                 "field" => "namespace"
               })
    end

    test "changeset requires service_id or cluster_id" do
      assert {:error, _} = Tool.validate(%LogLabels{}, %{"field" => "pod"})
    end

    test "json_schema loads" do
      assert %{"properties" => %{"field" => _}} = Tool.json_schema(%LogLabels{})
    end
  end

  describe "Metrics (plrl_metrics)" do
    test "changeset accepts query" do
      assert {:ok, %Metrics{query: "up"}} =
               Tool.validate(Metrics, %{"query" => "up", "step" => "1m"})
    end

    test "changeset requires query" do
      assert {:error, cs} = Tool.validate(Metrics, %{})
      assert "can't be blank" in errors_on(cs).query
    end

    test "json_schema loads" do
      assert %{"required" => ["query"]} = Tool.json_schema(Metrics)
    end
  end

  describe "MetricsSearch (plrl_metrics_search)" do
    test "changeset accepts query" do
      assert {:ok, %MetricsSearch{query: "cpu", limit: 50}} =
               Tool.validate(MetricsSearch, %{"query" => "cpu", "limit" => 50})
    end

    test "changeset requires query" do
      assert {:error, cs} = Tool.validate(MetricsSearch, %{})
      assert "can't be blank" in errors_on(cs).query
    end

    test "json_schema loads" do
      assert %{"properties" => %{"query" => _}} = Tool.json_schema(MetricsSearch)
    end
  end

  defp errors_on(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, _} -> msg end)
  end
end
