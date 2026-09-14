defmodule Console.Schema.MonitorTest do
  use Console.DataCase, async: true

  alias Console.Schema.Monitor

  describe "changeset/2" do
    test "accepts typed metrics queries and provider options" do
      changeset =
        Monitor.changeset(%Monitor{}, attrs(%{
          type: :metrics,
          query: %{
            metrics: %{
              query: "sum(rate(http_requests_total[5m]))",
              step: "1m",
              duration: "1h",
              options: %{azure: %{resource_id: "resource", aggregation: "Average"}}
            }
          }
        }))

      assert changeset.valid?

      assert %{query: %{metrics: %{options: %{azure: azure}}}} =
               Ecto.Changeset.apply_changes(changeset)

      assert azure.resource_id == "resource"
      assert azure.aggregation == "Average"
    end

    test "requires a workbench for named tools" do
      changeset =
        Monitor.changeset(%Monitor{}, attrs(%{
          type: :metrics,
          query: %{metrics: %{tool: "workbench_observability_metrics_prom", query: "up"}}
        }))

      refute changeset.valid?
      assert "is required for tool-backed monitor queries" in errors_on(changeset).workbench_id
    end

    test "rejects query embeds that do not match the monitor type" do
      changeset =
        Monitor.changeset(%Monitor{}, attrs(%{
          type: :log,
          query: %{
            log: %{query: "error", bucket_size: "5m"},
            metrics: %{query: "up"}
          }
        }))

      refute changeset.valid?
      assert "does not match monitor type log" in errors_on(changeset).query.metrics
    end
  end

  defp attrs(overrides) do
    Map.merge(%{
      name: "monitor",
      severity: :low,
      type: :log,
      evaluation_cron: "*/5 * * * *",
      service_id: Ecto.UUID.generate(),
      query: %{log: %{query: "error", bucket_size: "5m"}},
      threshold: %{aggregate: :max, value: 1.0}
    }, overrides)
  end
end
