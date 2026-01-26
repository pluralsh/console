defmodule ConsoleWeb.OpenAPI.CD.GlobalServiceControllerTest do
  use ConsoleWeb.ConnCase, async: true
  use Mimic

  describe "#show/2" do
    test "returns the global service if you can read", %{conn: conn} do
      user = admin_user()
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      global = insert(:global_service, project: project)

      result =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/cd/globalservices/#{global.id}")
        |> json_response(200)

      assert result["id"] == global.id
      assert result["name"] == global.name
    end

    test "it 403s if you cannot read", %{conn: conn} do
      user = insert(:user)
      project = insert(:project)
      global = insert(:global_service, project: project)

      conn
      |> add_auth_headers(user)
      |> get("/v1/api/cd/globalservices/#{global.id}")
      |> json_response(403)
    end
  end

  describe "#index/2" do
    test "returns the list of global services", %{conn: conn} do
      user = admin_user()
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      globals = insert_list(3, :global_service, project: project)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/cd/globalservices")
        |> json_response(200)

      assert ids_equal(results, globals)
    end

    test "filters by project_id", %{conn: conn} do
      user = admin_user()
      project1 = insert(:project, write_bindings: [%{user_id: user.id}])
      project2 = insert(:project, write_bindings: [%{user_id: user.id}])
      globals1 = insert_list(2, :global_service, project: project1)
      insert_list(2, :global_service, project: project2)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/cd/globalservices?project_id=#{project1.id}")
        |> json_response(200)

      assert ids_equal(results, globals1)
    end

    test "searches by name with q parameter", %{conn: conn} do
      user = admin_user()
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      global1 = insert(:global_service, project: project, name: "matching-global")
      insert(:global_service, project: project, name: "other-global")

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/cd/globalservices?q=matching")
        |> json_response(200)

      assert length(results) == 1
      assert hd(results)["id"] == global1.id
    end

    test "supports pagination", %{conn: conn} do
      user = admin_user()
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      insert_list(5, :global_service, project: project)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/cd/globalservices?page=1&per_page=2")
        |> json_response(200)

      assert length(results) == 2
    end
  end

  describe "#create/2" do
    test "it can create a global service with a source service", %{conn: conn} do
      service = insert(:service)

      result =
        conn
        |> add_auth_headers(admin_user())
        |> json_post("/v1/api/cd/globalservices?service_id=#{service.id}", %{
          name: "test-global-service",
          distro: "eks",
          tags: [%{name: "env", value: "prod"}]
        })
        |> json_response(200)

      assert result["id"]
      assert result["name"] == "test-global-service"
      assert result["distro"] == "eks"
      assert length(result["tags"]) == 1
      assert hd(result["tags"])["name"] == "env"
      assert hd(result["tags"])["value"] == "prod"
    end

    test "it can create a global service with a template", %{conn: conn} do
      repo = insert(:git_repository)

      result =
        conn
        |> add_auth_headers(admin_user())
        |> json_post("/v1/api/cd/globalservices", %{
          name: "template-global-service",
          template: %{
            name: "templated-service",
            namespace: "default",
            repository_id: repo.id,
            git: %{ref: "main", folder: "k8s"}
          }
        })
        |> json_response(200)

      assert result["id"]
      assert result["name"] == "template-global-service"
      assert result["template"]["name"] == "templated-service"
      assert result["template"]["namespace"] == "default"
    end

    test "it can create a global service with cascade settings", %{conn: conn} do
      service = insert(:service)

      result =
        conn
        |> add_auth_headers(admin_user())
        |> json_post("/v1/api/cd/globalservices?service_id=#{service.id}", %{
          name: "cascade-global-service",
          cascade: %{delete: true, detach: false}
        })
        |> json_response(200)

      assert result["id"]
      assert result["cascade"]["delete"] == true
      assert result["cascade"]["detach"] == false
    end

    test "non-admins cannot create a global service without project access", %{conn: conn} do
      service = insert(:service)

      conn
      |> add_auth_headers(insert(:user))
      |> json_post("/v1/api/cd/globalservices?service_id=#{service.id}", %{
        name: "test-global-service"
      })
      |> json_response(403)
    end
  end

  describe "#update/2" do
    test "it can update a global service", %{conn: conn} do
      user = admin_user()
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      global = insert(:global_service, project: project)

      result =
        conn
        |> add_auth_headers(user)
        |> json_put("/v1/api/cd/globalservices/#{global.id}", %{
          name: global.name,
          distro: "gke",
          tags: [%{name: "env", value: "staging"}]
        })
        |> json_response(200)

      assert result["id"] == global.id
      assert result["distro"] == "gke"
      assert hd(result["tags"])["value"] == "staging"
    end

    test "it can update cascade settings", %{conn: conn} do
      user = admin_user()
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      global = insert(:global_service, project: project)

      result =
        conn
        |> add_auth_headers(user)
        |> json_put("/v1/api/cd/globalservices/#{global.id}", %{
          name: global.name,
          cascade: %{delete: false, detach: true}
        })
        |> json_response(200)

      assert result["id"] == global.id
      assert result["cascade"]["delete"] == false
      assert result["cascade"]["detach"] == true
    end

    test "non-writers cannot update a global service", %{conn: conn} do
      user = insert(:user)
      project = insert(:project)
      global = insert(:global_service, project: project)

      conn
      |> add_auth_headers(user)
      |> json_put("/v1/api/cd/globalservices/#{global.id}", %{
        name: global.name,
        distro: "gke"
      })
      |> json_response(403)
    end
  end

  describe "#delete/2" do
    test "it can delete a global service", %{conn: conn} do
      user = admin_user()
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      global = insert(:global_service, project: project)

      result =
        conn
        |> add_auth_headers(user)
        |> delete("/v1/api/cd/globalservices/#{global.id}")
        |> json_response(200)

      assert result["id"] == global.id
      refute refetch(global)
    end

    test "non-writers cannot delete a global service", %{conn: conn} do
      user = insert(:user)
      project = insert(:project)
      global = insert(:global_service, project: project)

      conn
      |> add_auth_headers(user)
      |> delete("/v1/api/cd/globalservices/#{global.id}")
      |> json_response(403)
    end
  end

  describe "#sync/2" do
    test "it can sync a global service", %{conn: conn} do
      bot("console")
      user = admin_user()
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      global = insert(:global_service, project: project)

      result =
        conn
        |> add_auth_headers(user)
        |> post("/v1/api/cd/globalservices/#{global.id}/sync")
        |> json_response(200)

      assert result["id"] == global.id
    end

    test "non-writers cannot sync a global service", %{conn: conn} do
      user = insert(:user)
      project = insert(:project)
      global = insert(:global_service, project: project)

      conn
      |> add_auth_headers(user)
      |> post("/v1/api/cd/globalservices/#{global.id}/sync")
      |> json_response(403)
    end
  end
end
