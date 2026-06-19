defmodule Console.AI.Tools.Workbench.Observability.GenericToolsTest do
  use ExUnit.Case, async: true

  alias Console.AI.Tool
  alias Console.AI.Tools.Workbench.Observability.{Logs, Metrics, MetricsSearch}

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
end
