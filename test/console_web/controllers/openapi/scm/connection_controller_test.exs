defmodule ConsoleWeb.OpenAPI.SCM.ConnectionControllerTest do
  use ConsoleWeb.ConnCase, async: true

  describe "#show/2" do
    test "returns the scm connection", %{conn: conn} do
      user = insert(:user)
      scm = insert(:scm_connection)

      result =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/scm/connections/#{scm.id}")
        |> json_response(200)

      assert result["id"] == scm.id
      assert result["name"] == scm.name
      assert result["type"] == to_string(scm.type)
    end
  end

  describe "#index/2" do
    test "returns the list of scm connections", %{conn: conn} do
      user = insert(:user)
      connections = insert_list(3, :scm_connection)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/scm/connections")
        |> json_response(200)

      assert ids_equal(results, connections)
    end
  end

  describe "#create/2" do
    test "admins can create an scm connection", %{conn: conn} do
      result =
        conn
        |> add_auth_headers(admin_user())
        |> json_post("/api/v1/scm/connections", %{name: "github-conn", type: "github", token: "pat-test"})
        |> json_response(200)

      assert result["id"]
      assert result["name"] == "github-conn"
      assert result["type"] == "github"
    end

    test "non-admin users cannot create an scm connection", %{conn: conn} do
      conn
      |> add_auth_headers(insert(:user))
      |> json_post("/api/v1/scm/connections", %{name: "github-conn", type: "github", token: "pat-test"})
      |> json_response(403)
    end
  end

  describe "#update/2" do
    test "admins can update an scm connection", %{conn: conn} do
      scm = insert(:scm_connection)

      result =
        conn
        |> add_auth_headers(admin_user())
        |> json_put("/api/v1/scm/connections/#{scm.id}", %{
          type: scm.type,
          name: "updated-conn",
          token: "new-pat"
        })
        |> json_response(200)

      assert result["id"] == scm.id
      assert result["name"] == "updated-conn"
    end

    test "non-admin users cannot update an scm connection", %{conn: conn} do
      scm = insert(:scm_connection)

      conn
      |> add_auth_headers(insert(:user))
      |> json_put("/api/v1/scm/connections/#{scm.id}", %{type: scm.type, name: "updated-conn"})
      |> json_response(403)
    end
  end

  describe "#delete/2" do
    test "admins can delete an scm connection", %{conn: conn} do
      scm = insert(:scm_connection)

      result =
        conn
        |> add_auth_headers(admin_user())
        |> delete("/api/v1/scm/connections/#{scm.id}")
        |> json_response(200)

      assert result["id"] == scm.id
      refute refetch(scm)
    end

    test "non-admin users cannot delete an scm connection", %{conn: conn} do
      scm = insert(:scm_connection)

      conn
      |> add_auth_headers(insert(:user))
      |> delete("/api/v1/scm/connections/#{scm.id}")
      |> json_response(403)
    end
  end
end
