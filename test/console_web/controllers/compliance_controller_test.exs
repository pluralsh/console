defmodule ConsoleWeb.ComplianceControllerTest do
  use ConsoleWeb.ConnCase, async: true

  describe "#report/2" do
    test "it includes read and write users in the compliance report", %{conn: conn} do
      user1 = insert(:user, email: "user1@example.com")
      user2 = insert(:user, email: "user2@example.com")
      group = insert(:group, name: "compliance-group")

      cluster = insert(:cluster)

      insert(:policy_binding, policy_id: cluster.read_policy_id, user_id: user1.id)
      insert(:policy_binding, policy_id: cluster.read_policy_id, group_id: group.id)

      insert(:policy_binding, policy_id: cluster.write_policy_id, user_id: user2.id)

      clusters_content = Console.Compliance.Datasource.Clusters.stream()
      |> CSV.encode(headers: true)
      |> Enum.to_list()
      |> Enum.join()

      assert clusters_content =~ "user1@example.com"
      assert clusters_content =~ "group:compliance-group"
      assert clusters_content =~ "user2@example.com"

      conn
      |> add_auth_headers(admin_user())
      |> get("/v1/compliance/report?format=csv")
      |> response(200)

      [report] = Console.Repo.all(Console.Schema.ComplianceReport)
      assert report.name
      assert is_binary(report.sha256)
    end

    test "it will generate a compliance report for a permitted user", %{conn: conn} do
      insert_list(3, :cluster)
      insert_list(3, :service)
      insert_list(3, :vulnerability_report)

      conn
      |> add_auth_headers(admin_user())
      |> get("/v1/compliance/report?format=csv")
      |> response(200)

      [report] = Console.Repo.all(Console.Schema.ComplianceReport)
      assert report.name
      assert is_binary(report.sha256)
    end

    test "it will generate a compliance report for a permitted user in a compliance report generator", %{conn: conn} do
      user = insert(:user)
      generator = insert(:compliance_report_generator, read_bindings: [%{user_id: user.id}])

      insert_list(3, :cluster)
      insert_list(3, :service)
      insert_list(3, :vulnerability_report)

      conn
      |> add_auth_headers(user)
      |> get("/v1/compliance/report/#{generator.name}")
      |> response(200)

      [report] = Console.Repo.all(Console.Schema.ComplianceReport)
      assert report.name
      assert is_binary(report.sha256)
      assert report.generator_id == generator.id
    end

    test "it will not generate a compliance report if a user is not in a compliance report generator", %{conn: conn} do
      user = insert(:user)
      generator = insert(:compliance_report_generator)

      insert_list(3, :cluster)
      insert_list(3, :service)
      insert_list(3, :vulnerability_report)

      conn
      |> add_auth_headers(user)
      |> get("/v1/compliance/report/#{generator.name}")
      |> response(403)
    end

    test "disallowed users cannot generate reports", %{conn: conn} do
      insert_list(3, :cluster)
      insert_list(3, :service)
      insert_list(3, :vulnerability_report)

      conn
      |> add_auth_headers(insert(:user))
      |> get("/v1/compliance/report?format=csv")
      |> response(403)
      [] = Console.Repo.all(Console.Schema.ComplianceReport)
    end

    test "unauthenticated 403s", %{conn: conn} do
      conn
      |> get("/v1/compliance/report?format=csv")
      |> response(403)
    end
  end
end
