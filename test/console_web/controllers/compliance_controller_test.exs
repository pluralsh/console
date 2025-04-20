defmodule ConsoleWeb.ComplianceControllerTest do
  use ConsoleWeb.ConnCase, async: true

  describe "#report/2" do
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
