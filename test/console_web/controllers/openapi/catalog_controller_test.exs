defmodule ConsoleWeb.OpenAPI.CatalogControllerTest do
  use ConsoleWeb.ConnCase, async: true

  describe "#index/2" do
    test "returns catalogs for the project", %{conn: conn} do
      user = insert(:user)
      project = insert(:project)
      catalog = insert(:catalog, project: project, read_bindings: [%{user_id: user.id}])
      insert(:catalog, read_bindings: [%{user_id: user.id}])
      insert(:catalog, project: project)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/catalogs?project_id=#{project.id}")
        |> json_response(200)

      assert ids_equal(results, [catalog])
    end

    test "supports pagination", %{conn: conn} do
      user = insert(:user)
      project = insert(:project)
      insert_list(3, :catalog, project: project, read_bindings: [%{user_id: user.id}])

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/catalogs?project_id=#{project.id}&page=1&per_page=2")
        |> json_response(200)

      assert length(results) == 2
    end
  end

  describe "#show/2" do
    test "returns a catalog by id", %{conn: conn} do
      user = insert(:user)
      catalog = insert(:catalog, read_bindings: [%{user_id: user.id}])

      result =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/catalogs/#{catalog.id}")
        |> json_response(200)

      assert result["id"] == catalog.id
      assert result["name"] == catalog.name
    end

    test "returns a catalog by name", %{conn: conn} do
      user = insert(:user)
      catalog = insert(:catalog, read_bindings: [%{user_id: user.id}])

      result =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/catalogs/#{catalog.name}")
        |> json_response(200)

      assert result["id"] == catalog.id
      assert result["name"] == catalog.name
    end
  end

  describe "#pr_automations/2" do
    test "lists PR automations in a catalog", %{conn: conn} do
      user = insert(:user)
      project = insert(:project)
      catalog = insert(:catalog, project: project, read_bindings: [%{user_id: user.id}])
      pra_one = insert(:pr_automation, catalog: catalog, project: project)
      pra_two = insert(:pr_automation, catalog: catalog, project: project)
      insert(:pr_automation, project: project)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/catalogs/#{catalog.id}/prautomations")
        |> json_response(200)

      assert ids_equal(results, [pra_one, pra_two])
    end
  end
end
