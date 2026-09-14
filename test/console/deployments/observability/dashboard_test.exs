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
end
