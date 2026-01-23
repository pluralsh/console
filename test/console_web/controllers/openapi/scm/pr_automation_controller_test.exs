defmodule ConsoleWeb.OpenAPI.SCM.PrAutomationControllerTest do
  use ConsoleWeb.ConnCase, async: true
  use Mimic

  alias Console.Deployments.Pr.Dispatcher

  describe "#show/2" do
    test "returns the PR automation", %{conn: conn} do
      user = admin_user()
      pra = insert(:pr_automation)

      result =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/scm/prautomations/#{pra.id}")
        |> json_response(200)

      assert result["id"] == pra.id
      assert result["name"] == pra.name
      assert result["title"] == pra.title
      assert result["message"] == pra.message
    end
  end

  describe "#index/2" do
    test "returns the list of PR automations", %{conn: conn} do
      user = admin_user()
      pras = insert_list(3, :pr_automation)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/scm/prautomations")
        |> json_response(200)

      assert ids_equal(results, pras)
    end

    test "filters by project_id", %{conn: conn} do
      user = admin_user()
      project1 = insert(:project)
      project2 = insert(:project)
      pras1 = insert_list(2, :pr_automation, project: project1)
      insert_list(2, :pr_automation, project: project2)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/scm/prautomations?project_id=#{project1.id}")
        |> json_response(200)

      assert ids_equal(results, pras1)
    end

    test "filters by catalog_id", %{conn: conn} do
      user = admin_user()
      catalog1 = insert(:catalog)
      catalog2 = insert(:catalog)
      pras1 = insert_list(2, :pr_automation, catalog: catalog1)
      insert_list(2, :pr_automation, catalog: catalog2)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/scm/prautomations?catalog_id=#{catalog1.id}")
        |> json_response(200)

      assert ids_equal(results, pras1)
    end

    test "searches by name with q parameter", %{conn: conn} do
      user = admin_user()
      pra1 = insert(:pr_automation, name: "matching-automation")
      insert(:pr_automation, name: "other-automation")

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/scm/prautomations?q=matching")
        |> json_response(200)

      assert length(results) == 1
      assert hd(results)["id"] == pra1.id
    end

    test "supports pagination", %{conn: conn} do
      user = admin_user()
      insert_list(5, :pr_automation)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/scm/prautomations?page=1&per_page=2")
        |> json_response(200)

      assert length(results) == 2
    end
  end

  describe "#index_for_catalog/2" do
    test "returns PR automations for a specific catalog", %{conn: conn} do
      user = admin_user()
      catalog = insert(:catalog)
      pras = insert_list(3, :pr_automation, catalog: catalog)
      insert_list(2, :pr_automation)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/scm/catalogs/#{catalog.id}/prautomations")
        |> json_response(200)

      assert ids_equal(results, pras)
    end

    test "searches by name with q parameter", %{conn: conn} do
      user = admin_user()
      catalog = insert(:catalog)
      pra1 = insert(:pr_automation, catalog: catalog, name: "matching-automation")
      insert(:pr_automation, catalog: catalog, name: "other-automation")

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/scm/catalogs/#{catalog.id}/prautomations?q=matching")
        |> json_response(200)

      assert length(results) == 1
      assert hd(results)["id"] == pra1.id
    end

    test "supports pagination", %{conn: conn} do
      user = admin_user()
      catalog = insert(:catalog)
      insert_list(5, :pr_automation, catalog: catalog)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/scm/catalogs/#{catalog.id}/prautomations?page=1&per_page=2")
        |> json_response(200)

      assert length(results) == 2
    end
  end

  describe "#invoke/2" do
    test "it can invoke a PR automation to create a pull request", %{conn: conn} do
      user = admin_user()
      pra = insert(:pr_automation, create_bindings: [%{user_id: user.id}])
      expect(Dispatcher, :create, fn _, _, _ ->
        {:ok, %{url: "https://github.com/test/repo/pull/1", title: "Test PR"}}
      end)

      result =
        conn
        |> add_auth_headers(user)
        |> json_post("/api/v1/scm/prautomations/#{pra.id}/invoke", %{
          branch: "feature-branch",
          context: %{key: "value"}
        })
        |> json_response(200)

      assert result["id"]
      assert result["url"] == "https://github.com/test/repo/pull/1"
      assert result["title"] == "Test PR"
    end

    test "it respects create bindings for invoking PR automation", %{conn: conn} do
      user = insert(:user)
      pra = insert(:pr_automation)

      conn
      |> add_auth_headers(user)
      |> json_post("/api/v1/scm/prautomations/#{pra.id}/invoke", %{
        branch: "feature-branch",
        context: %{key: "value"}
      })
      |> json_response(403)
    end
  end
end
