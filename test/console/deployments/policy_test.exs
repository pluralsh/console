defmodule Console.Deployments.PolicyTest do
  use Console.DataCase, async: true
  alias Console.Deployments.Policy
  alias Console.Schema.{PolicyConstraint, VulnerabilityReport}

  describe "#upsert_vulnerabilities/2" do
    test "it can upsert vulnerabilities for a cluster" do
      cluster = insert(:cluster)
      svc     = insert(:service)

      attrs = %{
        artifact_url: "nginx:latest",
        os: %{eosl: false, family: "linux", name: "alpine"},
        summary: %{
          critical_count: 0,
          high_count:     1,
          medium_count:   0,
          low_count:      0,
          unknown_count:  0,
          none_count:     0
        },
        artifact: %{
          repository: "nginx",
          tag:        "latest"
        },
        services: [%{service_id: svc.id}],
        vulnerabilities: [%{
          resource:          "blah",
          fixed_version:     "1.2.0",
          installed_version: "1.1.0",
          severity:          :high,
          score:             8.0,
          cvss: %{redhat: %{v3_vector: "CVSS:3.1/AV:L/AC:L/PR:H/UI:N/S:C/C:H/I:N/A:N", v3_score: 6}},
          title:             "blah",
          description:       "blah",
          cvss_source:       "nvidia",
          primary_link:      "example.com",
          links:             []
        }]
      }

      {:ok, 1} = Policy.upsert_vulnerabilities([attrs], cluster)

      report = VulnerabilityReport.for_cluster(cluster.id)
               |> Repo.one()
               |> Repo.preload([:services, :vulnerabilities])

      assert report.artifact_url == "nginx:latest"
      refute report.os.eosl
      assert report.os.family == "linux"
      assert report.os.name == "alpine"

      assert report.summary.high_count == 1

      assert report.artifact.repository == "nginx"
      assert report.artifact.tag == "latest"

      [svc_vuln] = report.services

      assert svc_vuln.service_id == svc.id

      [vuln] = report.vulnerabilities

      assert vuln.resource == "blah"
      assert vuln.fixed_version == "1.2.0"
      assert vuln.installed_version == "1.1.0"
    end
  end

  describe "#upsert_constraints/2" do
    test "it can add constraints to the db for a cluster" do
      cluster = insert(:cluster)

      {:ok, 3} = Policy.upsert_constraints([
        %{
          name: "some-constraint",
          ref: %{kind: "K8sSomePolicy", name: "some-constraint"},
          violation_count: 0,
          violations: []
        },
        %{
          name: "other-constraint",
          ref: %{kind: "K8sSomePolicy", name: "other-constraint"},
          violation_count: 1,
          violations: [%{group: "apps", version: "v1", kind: "Deployment", namespace: "prod", name: "service", message: "this is bad"}]
        }
      ], cluster)

      constraints = PolicyConstraint.for_cluster(cluster.id)
                    |> Repo.all()
                    |> Repo.preload([:violations])

      assert length(constraints) == 2
      by_name = Map.new(constraints, & {&1.name, &1})

      assert length(by_name["other-constraint"].violations) == 1
      assert length(by_name["some-constraint"].violations) == 0
    end

    test "it can prune no longer used constraints" do
      cluster = insert(:cluster)
      keep = insert(:policy_constraint, cluster: cluster, name: "some-constraint")
      ignore = insert(:policy_constraint, cluster: cluster, name: "other-constraint")

      {:ok, _} = Policy.upsert_constraints([
        %{
          name: "some-constraint",
          ref: %{kind: "K8sSomePolicy", name: "some-constraint"},
          violation_count: 0,
          violations: []
        },
      ], cluster)

      refute refetch(ignore)
      keep = refetch(keep)
      assert keep.ref.kind == "K8sSomePolicy"
      assert keep.ref.name == "some-constraint"
    end
  end
end
