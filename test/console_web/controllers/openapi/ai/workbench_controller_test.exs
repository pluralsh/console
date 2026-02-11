defmodule ConsoleWeb.OpenAPI.AI.WorkbenchControllerTest do
  use ConsoleWeb.ConnCase, async: true

  describe "#show/2" do
    test "returns the workbench by id when user has access", %{conn: conn} do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project, name: "my-workbench")

      result =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/ai/workbenches/#{workbench.id}")
        |> json_response(200)

      assert result["id"] == workbench.id
      assert result["name"] == workbench.name
      assert result["description"] == workbench.description
    end

    test "returns the workbench for admin users", %{conn: conn} do
      workbench = insert(:workbench)

      result =
        conn
        |> add_auth_headers(admin_user())
        |> get("/v1/api/ai/workbenches/#{workbench.id}")
        |> json_response(200)

      assert result["id"] == workbench.id
    end

    test "403s if user does not have access", %{conn: conn} do
      user = insert(:user)
      workbench = insert(:workbench)

      conn
      |> add_auth_headers(user)
      |> get("/v1/api/ai/workbenches/#{workbench.id}")
      |> json_response(403)
    end
  end

  describe "#show_by_name/2" do
    test "returns the workbench by name when user has access", %{conn: conn} do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project, name: "unique-by-name")

      result =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/ai/workbenches/name?name=unique-by-name")
        |> json_response(200)

      assert result["id"] == workbench.id
      assert result["name"] == "unique-by-name"
    end

    test "returns the workbench by name for admin users", %{conn: conn} do
      workbench = insert(:workbench, name: "admin-workbench")

      result =
        conn
        |> add_auth_headers(admin_user())
        |> get("/v1/api/ai/workbenches/name?name=admin-workbench")
        |> json_response(200)

      assert result["id"] == workbench.id
    end

    test "403s if user does not have access", %{conn: conn} do
      user = insert(:user)
      insert(:workbench, name: "forbidden-workbench")

      conn
      |> add_auth_headers(user)
      |> get("/v1/api/ai/workbenches/name?name=forbidden-workbench")
      |> json_response(403)
    end
  end

  describe "#index/2" do
    test "returns the list of workbenches user has access to", %{conn: conn} do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbenches = insert_list(3, :workbench, project: project)
      insert_list(2, :workbench)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/ai/workbenches")
        |> json_response(200)

      assert ids_equal(results, workbenches)
    end

    test "filters by project_id", %{conn: conn} do
      project_a = insert(:project)
      project_b = insert(:project)
      workbenches_a = insert_list(2, :workbench, project: project_a)
      insert_list(2, :workbench, project: project_b)

      %{"data" => results} =
        conn
        |> add_auth_headers(admin_user())
        |> get("/v1/api/ai/workbenches?project_id=#{project_a.id}")
        |> json_response(200)

      assert ids_equal(results, workbenches_a)
    end

    test "searches by name with q", %{conn: conn} do
      workbench = insert(:workbench, name: "searchable-workbench")
      insert(:workbench, name: "other")

      %{"data" => results} =
        conn
        |> add_auth_headers(admin_user())
        |> get("/v1/api/ai/workbenches?q=searchable")
        |> json_response(200)

      assert length(results) == 1
      assert hd(results)["id"] == workbench.id
    end

    test "supports pagination", %{conn: conn} do
      insert_list(5, :workbench)

      %{"data" => results} =
        conn
        |> add_auth_headers(admin_user())
        |> get("/v1/api/ai/workbenches?page=1&per_page=2")
        |> json_response(200)

      assert length(results) == 2
    end

    test "admin users can see all workbenches", %{conn: conn} do
      workbenches = insert_list(3, :workbench)

      %{"data" => results} =
        conn
        |> add_auth_headers(admin_user())
        |> get("/v1/api/ai/workbenches")
        |> json_response(200)

      assert ids_equal(results, workbenches)
    end
  end
end
