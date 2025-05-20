defmodule Console.GraphQl.Deployments.PolicyMutationsTest do
  use Console.DataCase, async: true

  describe "upsertPolicyConstraints" do
    test "it can create some constraints" do
      {:ok, %{data: %{"upsertPolicyConstraints" => 1}}} = run_query("""
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

  describe "upsertComplianceReportGenerator" do
    test "admins can create a compliance report generator" do
      group = insert(:group)

      {:ok, %{data: %{"upsertComplianceReportGenerator" => gen}}} = run_query("""
        mutation Upsert($attributes: ComplianceReportGeneratorAttributes!) {
          upsertComplianceReportGenerator(attributes: $attributes) {
            id
            name
            format
            readBindings { group { name } }
          }
        }
      """, %{"attributes" => %{
        "name" => "my-generator",
        "format" => "CSV",
        "readBindings" => [%{"groupId" => group.id}]
      }}, %{current_user: admin_user()})

      assert gen["id"]
      assert gen["name"] == "my-generator"
      assert gen["format"] == "CSV"
      [%{"group" => g}] = gen["readBindings"]
      assert g["name"] == group.name
    end

    test "non-admins cannot create a compliance report generator" do
      group = insert(:group)

      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation Upsert($attributes: ComplianceReportGeneratorAttributes) {
          upsertComplianceReportGenerator(attributes: $attributes) {
            id
            name
            format
            readBindings { group { name } }
          }
        }
      """, %{"attributes" => %{
        "name" => "my-generator",
        "format" => "CSV",
        "readBindings" => [%{"groupId" => group.id}]
      }}, %{current_user: insert(:user)})
    end
  end

  describe "deleteComplianceReportGenerator" do
    test "admins can delete a compliance report generator" do
      gen = insert(:compliance_report_generator)

      {:ok, %{data: %{"deleteComplianceReportGenerator" => del}}} = run_query("""
        mutation Delete($id: ID!) {
          deleteComplianceReportGenerator(id: $id) { id }
        }
      """, %{"id" => gen.id}, %{current_user: admin_user()})

      assert del["id"] == gen.id

      refute refetch(gen)
    end

    test "non-admins cannot delete a compliance report generator" do
      gen = insert(:compliance_report_generator)

      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation Delete($id: ID!) {
          deleteComplianceReportGenerator(id: $id) { id }
        }
      """, %{"id" => gen.id}, %{current_user: insert(:user)})

      assert refetch(gen)
    end
  end
end
