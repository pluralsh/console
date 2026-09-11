defmodule Console.AI.Tools.Workbench.Observability.GenericToolsTest do
  use ExUnit.Case, async: true

  alias Console.AI.Tool
  alias Console.AI.Tools.Workbench.Observability.{LogAggregate, Logs, Metrics, MetricsSearch}
  alias Console.Schema.WorkbenchTool

  describe "MetricsSearch" do
    test "changeset accepts azure options" do
      assert {:ok, %MetricsSearch{options: %{azure: %{resource_id: "resource-id"}}}} =
               Tool.validate(%MetricsSearch{}, %{
                 "query" => "cpu",
                 "options" => %{
                   "azure" => %{"resource_id" => "resource-id"}
                 }
               })
    end
  end

  describe "Metrics" do
    test "changeset accepts azure options" do
      assert {:ok, %Metrics{options: %{azure: %{resource_id: "resource-id", aggregation: "Average"}}}} =
               Tool.validate(%Metrics{}, %{
                 "query" => "cpu",
                 "options" => %{
                   "azure" => %{
                     "resource_id" => "resource-id",
                     "aggregation" => "Average"
                   }
                 }
               })
    end
  end

  describe "Logs" do
    test "describes Elasticsearch message query semantics" do
      description =
        Logs.description(%Logs{
          tool: %WorkbenchTool{name: "elastic", tool: :elastic}
        })

      assert description =~ ~s(query against the "message" field only)
      assert description =~ "combines its terms with OR"
      assert description =~ ~s(empty query or "*" to match all log messages)
      assert description =~ "Facet"
      assert description =~ "combined with AND"
    end

    test "accepts an empty query for every provider" do
      elastic = %Logs{tool: %WorkbenchTool{name: "elastic", tool: :elastic}}
      loki = %Logs{tool: %WorkbenchTool{name: "loki", tool: :loki}}

      assert {:ok, %Logs{query: nil}} = Tool.validate(elastic, %{"query" => ""})
      assert {:ok, %Logs{query: nil}} = Tool.validate(loki, %{})
      refute "query" in Map.get(Logs.json_schema(%{tool: %{tool: :loki}}), "required", [])
      assert Logs.description(loki) =~ ~s(defaults to `{job=~".+"}`)
    end

    test "changeset accepts azure options" do
      assert {:ok, %Logs{options: %{azure: %{resource_id: "resource-id"}}}} =
               Tool.validate(%Logs{}, %{
                 "query" => "exceptions",
                 "options" => %{
                   "azure" => %{"resource_id" => "resource-id"}
                 }
               })
    end
  end

  describe "LogAggregate" do
    test "defaults query terms to OR" do
      assert {:ok, %LogAggregate{operator: :or}} =
               Tool.validate(%LogAggregate{}, %{
                 "query" => "error failure",
                 "bucket_size" => "5m"
               })

      assert LogAggregate.json_schema(%{tool: %{tool: :elastic}})["properties"]["operator"]["default"] == "or"
    end

    test "describes Elasticsearch message query semantics" do
      description =
        LogAggregate.description(%LogAggregate{
          tool: %WorkbenchTool{name: "elastic", tool: :elastic}
        })

      assert description =~ ~s(query against the "message" field only)
      assert description =~ "defaults to OR"
      assert description =~ ~s(empty query or "*" to match all log messages)
      assert description =~ "combined with AND"
    end

    test "accepts an empty query for every provider" do
      elastic = %LogAggregate{tool: %WorkbenchTool{name: "elastic", tool: :elastic}}
      loki = %LogAggregate{tool: %WorkbenchTool{name: "loki", tool: :loki}}
      attrs = %{"query" => "", "bucket_size" => "5m"}

      assert {:ok, %LogAggregate{query: nil}} = Tool.validate(elastic, attrs)
      assert {:ok, %LogAggregate{query: nil}} = Tool.validate(loki, Map.delete(attrs, "query"))
      refute "query" in LogAggregate.json_schema(%{tool: %{tool: :loki}})["required"]
    end

    test "changeset accepts aggregation and azure options" do
      assert {:ok,
              %LogAggregate{
                bucket_size: "5m",
                operator: :or,
                options: %{azure: %{resource_id: "resource-id"}}
              }} =
               Tool.validate(%LogAggregate{}, %{
                 "query" => "exceptions",
                 "bucket_size" => "5m",
                 "operator" => "or",
                 "options" => %{
                   "azure" => %{"resource_id" => "resource-id"}
                 }
               })
    end
  end
end
