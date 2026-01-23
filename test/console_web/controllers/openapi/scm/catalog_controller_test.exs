defmodule ConsoleWeb.OpenAPI.SCM.CatalogControllerTest do
  use ConsoleWeb.ConnCase, async: true
  use Mimic

  describe "#show/2" do
    test "returns the catalog if you can read", %{conn: conn} do
      user = admin_user()
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      catalog = insert(:catalog, project: project, read_bindings: [%{user_id: user.id}])

      result =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/scm/catalogs/#{catalog.id}")
        |> json_response(200)

      assert result["id"] == catalog.id
      assert result["name"] == catalog.name
      assert result["author"] == catalog.author
    end

    test "it 403s if you cannot read", %{conn: conn} do
      user = insert(:user)
      project = insert(:project)
      catalog = insert(:catalog, project: project)

      conn
      |> add_auth_headers(user)
      |> get("/api/v1/scm/catalogs/#{catalog.id}")
      |> json_response(403)
    end
  end

  describe "#index/2" do
    test "returns the list of catalogs", %{conn: conn} do
      user = admin_user()
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      catalogs = insert_list(3, :catalog, project: project, read_bindings: [%{user_id: user.id}])

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/scm/catalogs")
        |> json_response(200)

      assert ids_equal(results, catalogs)
    end

    test "filters by project_id", %{conn: conn} do
      user = admin_user()
      project1 = insert(:project, write_bindings: [%{user_id: user.id}])
      project2 = insert(:project, write_bindings: [%{user_id: user.id}])
      catalogs1 = insert_list(2, :catalog, project: project1, read_bindings: [%{user_id: user.id}])
      insert_list(2, :catalog, project: project2, read_bindings: [%{user_id: user.id}])

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/scm/catalogs?project_id=#{project1.id}")
        |> json_response(200)

      assert ids_equal(results, catalogs1)
    end

    test "searches by name with q parameter", %{conn: conn} do
      user = admin_user()
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      catalog1 = insert(:catalog, project: project, name: "matching-catalog", read_bindings: [%{user_id: user.id}])
      insert(:catalog, project: project, name: "other-catalog", read_bindings: [%{user_id: user.id}])

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/scm/catalogs?q=matching")
        |> json_response(200)

      assert length(results) == 1
      assert hd(results)["id"] == catalog1.id
    end

    test "supports pagination", %{conn: conn} do
      user = admin_user()
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      insert_list(5, :catalog, project: project, read_bindings: [%{user_id: user.id}])

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/scm/catalogs?page=1&per_page=2")
        |> json_response(200)

      assert length(results) == 2
    end
  end

  describe "#create/2" do
    test "it can create a catalog", %{conn: conn} do
      result =
        conn
        |> add_auth_headers(admin_user())
        |> json_post("/api/v1/scm/catalogs", %{
          name: "test-catalog",
          author: "Test Author",
          description: "A test catalog",
          category: "infrastructure"
        })
        |> json_response(200)

      assert result["id"]
      assert result["name"] == "test-catalog"
      assert result["author"] == "Test Author"
      assert result["description"] == "A test catalog"
      assert result["category"] == "infrastructure"
    end

    test "it can upsert a catalog by name", %{conn: conn} do
      user = admin_user()
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      catalog = insert(:catalog, name: "existing-catalog", project: project, write_bindings: [%{user_id: user.id}])

      result =
        conn
        |> add_auth_headers(user)
        |> json_post("/api/v1/scm/catalogs", %{
          name: "existing-catalog",
          author: "Updated Author",
          description: "Updated description"
        })
        |> json_response(200)

      assert result["id"] == catalog.id
      assert result["author"] == "Updated Author"
      assert result["description"] == "Updated description"
    end

    test "non-admins cannot create a catalog without project access", %{conn: conn} do
      conn
      |> add_auth_headers(insert(:user))
      |> json_post("/api/v1/scm/catalogs", %{
        name: "test-catalog",
        author: "Test Author"
      })
      |> json_response(403)
    end
  end

  describe "#update/2" do
    test "it can update a catalog", %{conn: conn} do
      user = admin_user()
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      catalog = insert(:catalog, project: project, write_bindings: [%{user_id: user.id}])

      result =
        conn
        |> add_auth_headers(user)
        |> json_put("/api/v1/scm/catalogs/#{catalog.id}", %{
          name: catalog.name,
          author: catalog.author,
          description: "Updated description",
          category: "applications"
        })
        |> json_response(200)

      assert result["id"] == catalog.id
      assert result["description"] == "Updated description"
      assert result["category"] == "applications"
    end

    test "non-writers cannot update a catalog", %{conn: conn} do
      user = insert(:user)
      project = insert(:project)
      catalog = insert(:catalog, project: project)

      conn
      |> add_auth_headers(user)
      |> json_put("/api/v1/scm/catalogs/#{catalog.id}", %{
        name: catalog.name,
        author: catalog.author,
        description: "Updated description"
      })
      |> json_response(403)
    end
  end

  describe "#delete/2" do
    test "it can delete a catalog", %{conn: conn} do
      user = admin_user()
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      catalog = insert(:catalog, project: project, write_bindings: [%{user_id: user.id}])

      result =
        conn
        |> add_auth_headers(user)
        |> delete("/api/v1/scm/catalogs/#{catalog.id}")
        |> json_response(200)

      assert result["id"] == catalog.id
      refute refetch(catalog)
    end

    test "non-writers cannot delete a catalog", %{conn: conn} do
      user = insert(:user)
      project = insert(:project)
      catalog = insert(:catalog, project: project)

      conn
      |> add_auth_headers(user)
      |> delete("/api/v1/scm/catalogs/#{catalog.id}")
      |> json_response(403)
    end
  end
end
