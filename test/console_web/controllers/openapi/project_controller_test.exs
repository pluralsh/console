defmodule ConsoleWeb.OpenAPI.ProjectControllerTest do
  use ConsoleWeb.ConnCase, async: true
  use Mimic
  alias Console.Deployments.Settings

  describe "#show/2" do
    test "returns the project if you can read", %{conn: conn} do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])

      result =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/projects/#{project.id}")
        |> json_response(200)

      assert result["id"] == project.id
      assert result["name"] == project.name
      assert result["description"] == project.description
    end

    test "returns the project for admin users", %{conn: conn} do
      user = admin_user()
      project = insert(:project)

      result =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/projects/#{project.id}")
        |> json_response(200)

      assert result["id"] == project.id
      assert result["name"] == project.name
    end

    test "it 403s if you cannot read", %{conn: conn} do
      user = insert(:user)
      project = insert(:project)

      conn
      |> add_auth_headers(user)
      |> get("/v1/api/projects/#{project.id}")
      |> json_response(403)
    end
  end

  describe "#index/2" do
    test "returns the list of projects for the user", %{conn: conn} do
      user = insert(:user)
      projects = insert_list(3, :project, read_bindings: [%{user_id: user.id}])
      insert_list(2, :project)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/projects")
        |> json_response(200)

      assert ids_equal(results, projects)
    end

    test "admin users can see all projects", %{conn: conn} do
      user = admin_user()
      projects = insert_list(3, :project)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/projects")
        |> json_response(200)

      assert ids_equal(results, [Settings.default_project!() | projects])
    end

    test "supports pagination", %{conn: conn} do
      user = admin_user()
      insert_list(5, :project)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/projects?page=1&per_page=2")
        |> json_response(200)

      assert length(results) == 2
    end

    test "returns projects ordered by name", %{conn: conn} do
      user = admin_user()
      projects = insert_list(3, :project)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/projects")
        |> json_response(200)

      assert ids_equal(results, [Settings.default_project!() | projects])
    end
  end
end
