defmodule Console.GraphQl.Deployments.PolicyMutationsTest do
  use Console.DataCase, async: true

  describe "upsertPolicyConstraints" do
    test "it can create some constraints" do
      {:ok, %{data: %{"upsertPolicyConstraints" => 2}}} = run_query("""
        mutation Upsert($constraints: [PolicyConstraintAttributes]) {
          upsertPolicyConstraints(constraints: $constraints)
        }
      """, %{"constraints" => [
        %{
          "name" => "some-constraint",
          "ref" => %{"kind" => "K8sSomePolicy", "name" => "some-constraint"},
          "violation_count" => 0,
          "violations" => []
        }
      ]}, %{cluster: insert(:cluster)})
    end
  end

  describe "upsertVulnerabilities" do
    test "it will upsert vulnerability reports for a cluster" do
      cluster = insert(:cluster)

      {:ok, %{data: %{"upsertVulnerabilities" => 1}}} = run_query("""
        mutation Upsert($vulnerabilities: [VulnerabilityReportAttributes]) {
          upsertVulnerabilities(vulnerabilities: $vulnerabilities)
        }
      """, %{"vulnerabilities" => [%{
        "artifact_url" => "nginx:latest",
        "vulnerabilities" => [%{
          "resource" =>          "blah",
          "fixed_version" =>     "1.2.0",
          "installed_version" => "1.1.0",
          "severity" =>          "HIGH",
          "score" =>             8.0,
          "title" =>             "blah",
          "description" =>       "blah",
          "cvss_source" =>       "nvidia",
          "primary_link" =>      "example.com",
          "links" =>             []
        }]
      }]}, %{cluster: cluster})
    end
  end
end
