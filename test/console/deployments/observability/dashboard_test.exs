defmodule Console.Deployments.Observability.DashboardTest do
  use ExUnit.Case, async: true

  alias Console.Deployments.Observability.Dashboard

  describe "substitute/2" do
    test "recursively substitutes Grafana-style dashboard variables" do
      value = %{
        "query" => "sum(rate(requests{namespace=\"${namespace}\",pod=~\"${pods}\"}[5m]))",
        "facets" => ["${namespace}", %{"values" => "${pods}"}],
        "unresolved" => "${missing}"
      }

      assert Dashboard.substitute(value, %{
               namespace: "production",
               pods: ["api-0", "api-1"]
             }) == %{
               "query" =>
                 "sum(rate(requests{namespace=\"production\",pod=~\"api-0,api-1\"}[5m]))",
               "facets" => ["production", %{"values" => "api-0,api-1"}],
               "unresolved" => "${missing}"
             }
    end
  end

  describe "metric_query_step/2" do
    test "picks a fine step for short ranges" do
      start_at = ~U[2026-09-07 21:00:00Z]
      end_at = ~U[2026-09-07 22:00:00Z]

      assert Dashboard.metric_query_step(%{start: start_at, end: end_at}) == "15s"
    end

    test "coarsens step for year-long ranges so queries stay under max points" do
      end_at = ~U[2026-09-18 12:00:00Z]
      start_at = DateTime.add(end_at, -365, :day)

      assert Dashboard.metric_query_step(%{"start" => start_at, "end" => end_at}) == "2d"
    end

    test "falls back to whole days past the static candidates" do
      end_at = ~U[2026-09-18 12:00:00Z]
      start_at = DateTime.add(end_at, -730, :day)

      assert Dashboard.metric_query_step(%{start: start_at, end: end_at}) == "4d"
    end

    test "formats ISO-8601 intervals for azure" do
      start_at = ~U[2026-09-07 21:00:00Z]
      end_at = ~U[2026-09-07 22:00:00Z]

      assert Dashboard.metric_query_step(%{start: start_at, end: end_at}, :iso8601) == "PT15S"
    end

    test "returns nil when the provider takes no step" do
      start_at = ~U[2026-09-07 21:00:00Z]
      end_at = ~U[2026-09-07 22:00:00Z]

      assert Dashboard.metric_query_step(%{start: start_at, end: end_at}, :none) == nil
    end
  end
end
