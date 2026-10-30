defmodule ConsoleWeb.PolicyControllerTest do
  use ConsoleWeb.ConnCase, async: true

  describe "#vulnerabilities/2" do
    test "it upserts reports posted by a cluster", %{conn: conn} do
      cluster = insert(:cluster)
      other = insert(:cluster)
      svc = insert(:service, cluster: cluster)

      report = %{
        "artifact_url" => "nginx:latest",
        "cluster_id" => other.id,
        "unknown_field" => "ignored",
        "summary" => %{"critical_count" => 0, "high_count" => 1},
        "services" => [%{"service_id" => svc.id}],
        "namespaces" => [%{"namespace" => "default"}],
        "vulnerabilities" => [%{
          "resource" =>          "openssl",
          "fixed_version" =>     "1.2.0",
          "installed_version" => "1.1.0",
          "severity" =>          "high",
          "score" =>             8,
          "title" =>             "blah",
          "links" =>             ["b.example.com", "a.example.com"],
          "published_date" =>    "2024-01-01T00:00:00Z",
          "cvss" =>              %{"nvidia" => %{"v3_vector" => "CVSS:3.1/AV:N", "v3_score" => 9.8}}
        }]
      }

      for _ <- 1..2 do
        assert %{"count" => 1} =
          conn
          |> add_auth_headers(cluster)
          |> post_json("/ext/v1/vulnerabilities", %{"reports" => [report]})
          |> json_response(200)
      end

      [vr] = Console.Repo.all(Console.Schema.VulnerabilityReport)
             |> Console.Repo.preload([:vulnerabilities, :services, :namespaces])
      assert vr.cluster_id == cluster.id
      assert vr.artifact_url == "nginx:latest"
      assert vr.grade == :d
      assert [%{service_id: svc_id}] = vr.services
      assert svc_id == svc.id
      assert [%{namespace: "default"}] = vr.namespaces

      [vuln] = vr.vulnerabilities
      assert vuln.resource == "openssl"
      assert vuln.severity == :high
      assert vuln.score == 8.0
      assert vuln.links == ["a.example.com", "b.example.com"]
      assert vuln.published_date == ~U[2024-01-01 00:00:00.000000Z]
      assert vuln.cvss.nvidia.v3_score == 9.8
    end

    test "it rejects invalid enum values", %{conn: conn} do
      conn
      |> add_auth_headers(insert(:cluster))
      |> post_json("/ext/v1/vulnerabilities", %{"reports" => [%{
        "artifact_url" => "nginx:latest",
        "vulnerabilities" => [%{"resource" => "openssl", "severity" => "severe"}]
      }]})
      |> json_response(422)
    end

    test "it rejects reports without an artifact url", %{conn: conn} do
      %{"error" => msg} =
        conn
        |> add_auth_headers(insert(:cluster))
        |> post_json("/ext/v1/vulnerabilities", %{"reports" => [%{"vulnerabilities" => []}]})
        |> json_response(400)

      assert msg =~ "artifact_url"
    end

    test "it rejects malformed bodies", %{conn: conn} do
      conn
      |> add_auth_headers(insert(:cluster))
      |> post_json("/ext/v1/vulnerabilities", [%{"artifact_url" => "nginx:latest"}])
      |> json_response(400)
    end

    test "it requires a cluster token", %{conn: conn} do
      conn
      |> add_auth_headers(admin_user())
      |> post_json("/ext/v1/vulnerabilities", %{"reports" => []})
      |> json_response(403)
    end
  end

  describe "#constraints/2" do
    test "it upserts constraints posted by a cluster", %{conn: conn} do
      cluster = insert(:cluster)

      constraint = %{
        "name" => "require-labels",
        "description" => "pods need labels",
        "violation_count" => 1,
        "enforcement" => "dry_run",
        "ref" => %{"kind" => "K8sRequiredLabels", "name" => "require-labels"},
        "violations" => [%{
          "group" => "",
          "version" => "v1",
          "kind" => "Pod",
          "namespace" => "default",
          "name" => "nginx",
          "message" => "missing label app",
          "constraint_id" => Ecto.UUID.generate()
        }]
      }

      for _ <- 1..2 do
        assert %{"count" => 1} =
          conn
          |> add_auth_headers(cluster)
          |> post_json("/ext/v1/constraints", %{"constraints" => [constraint]})
          |> json_response(200)
      end

      [pc] = Console.Repo.all(Console.Schema.PolicyConstraint)
             |> Console.Repo.preload(:violations)
      assert pc.cluster_id == cluster.id
      assert pc.name == "require-labels"
      assert pc.enforcement == :dry_run
      assert pc.violation_count == 1
      assert pc.ref.kind == "K8sRequiredLabels"

      [violation] = pc.violations
      assert violation.constraint_id == pc.id
      assert violation.kind == "Pod"
      assert violation.message == "missing label app"
    end

    test "it rejects constraints without a name", %{conn: conn} do
      conn
      |> add_auth_headers(insert(:cluster))
      |> post_json("/ext/v1/constraints", %{"constraints" => [%{"description" => "blah"}]})
      |> json_response(400)
    end

    test "it requires a cluster token", %{conn: conn} do
      conn
      |> add_auth_headers(admin_user())
      |> post_json("/ext/v1/constraints", %{"constraints" => []})
      |> json_response(403)
    end
  end

  defp post_json(conn, path, body) do
    conn
    |> put_req_header("content-type", "application/json")
    |> post(path, Jason.encode!(body))
  end
end
