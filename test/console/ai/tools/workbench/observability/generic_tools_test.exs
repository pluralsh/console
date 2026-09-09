defmodule Console.AI.Tools.Workbench.Observability.GenericToolsTest do
  use ExUnit.Case, async: true

  alias Console.AI.Tool
  alias Console.AI.Tools.Workbench.Observability.{LogAggregate, Logs, Metrics, MetricsSearch}

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
