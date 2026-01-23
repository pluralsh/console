defmodule ConsoleWeb.OpenAPI.CD.ServiceControllerTest do
  use ConsoleWeb.ConnCase, async: true
  use Mimic

  describe "#show/2" do
    test "returns the service if you can read", %{conn: conn} do
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])
      service = insert(:service, cluster: cluster, read_bindings: [%{user_id: user.id}])

      result =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/cd/services/#{service.id}")
        |> json_response(200)

      assert result["id"] == service.id
      assert result["name"] == service.name
      assert result["namespace"] == service.namespace
      assert result["status"] == to_string(service.status)
    end

    test "it 403s if you cannot read", %{conn: conn} do
      user = insert(:user)
      service = insert(:service)

      conn
      |> add_auth_headers(user)
      |> get("/api/v1/cd/services/#{service.id}")
      |> json_response(403)
    end
  end

  describe "#index/2" do
    test "returns the list of services", %{conn: conn} do
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])
      services = insert_list(3, :service, cluster: cluster, read_bindings: [%{user_id: user.id}])
      insert_list(3, :service)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/cd/services")
        |> json_response(200)

      assert ids_equal(results, services)
    end

    test "filters by cluster_id", %{conn: conn} do
      user = insert(:user)
      cluster1 = insert(:cluster, write_bindings: [%{user_id: user.id}])
      cluster2 = insert(:cluster, write_bindings: [%{user_id: user.id}])
      services1 = insert_list(2, :service, cluster: cluster1, read_bindings: [%{user_id: user.id}])
      insert_list(2, :service, cluster: cluster2, read_bindings: [%{user_id: user.id}])

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/cd/services?cluster_id=#{cluster1.id}")
        |> json_response(200)

      assert ids_equal(results, services1)
    end

    test "filters by status", %{conn: conn} do
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])
      healthy_services = insert_list(2, :service, cluster: cluster, status: :healthy, read_bindings: [%{user_id: user.id}])
      insert_list(2, :service, cluster: cluster, status: :failed, read_bindings: [%{user_id: user.id}])

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/cd/services?status=healthy")
        |> json_response(200)

      assert ids_equal(results, healthy_services)
    end

    test "searches by name with q parameter", %{conn: conn} do
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])
      service1 = insert(:service, cluster: cluster, name: "matching-service", read_bindings: [%{user_id: user.id}])
      insert(:service, cluster: cluster, name: "other-service", read_bindings: [%{user_id: user.id}])

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/cd/services?q=matching")
        |> json_response(200)

      assert length(results) == 1
      assert hd(results)["id"] == service1.id
    end

    test "supports pagination", %{conn: conn} do
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])
      insert_list(5, :service, cluster: cluster, read_bindings: [%{user_id: user.id}])

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/cd/services?page=1&per_page=2")
        |> json_response(200)

      assert length(results) == 2
    end
  end

  describe "#create/2" do
    test "it can create a service", %{conn: conn} do
      repo = insert(:git_repository)
      cluster = insert(:cluster)

      result =
        conn
        |> add_auth_headers(admin_user())
        |> json_post("/api/v1/cd/services?cluster_id=#{cluster.id}", %{
          name: "test-service",
          namespace: "test-namespace",
          repository_id: repo.id,
          git: %{ref: "main", folder: "k8s"}
        })
        |> json_response(200)

      assert result["id"]
      assert result["name"] == "test-service"
      assert result["namespace"] == "test-namespace"
      assert result["status"] == "stale"
      assert result["repository_id"] == repo.id
      assert result["git"]["ref"] == "main"
      assert result["git"]["folder"] == "k8s"
    end

    test "non-writers cannot create a service", %{conn: conn} do
      repo = insert(:git_repository)
      cluster = insert(:cluster)

      conn
      |> add_auth_headers(insert(:user))
      |> json_post("/api/v1/cd/services?cluster_id=#{cluster.id}", %{
        name: "test-service",
        namespace: "test-namespace",
        repository_id: repo.id,
        git: %{ref: "main", folder: "k8s"}
      })
      |> json_response(403)
    end
  end

  describe "#update/2" do
    test "it can update a service", %{conn: conn} do
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])
      service = insert(:service, cluster: cluster, write_bindings: [%{user_id: user.id}])

      result =
        conn
        |> add_auth_headers(user)
        |> json_put("/api/v1/cd/services/#{service.id}", %{
          helm: %{values: "foo: bar"},
          name: service.name,
          namespace: service.namespace
        })
        |> json_response(200)

      assert result["id"] == service.id
      assert result["helm"]["values"] == "foo: bar"
    end

    test "non-writers cannot update a service", %{conn: conn} do
      user = insert(:user)
      service = insert(:service)

      conn
      |> add_auth_headers(user)
      |> json_put("/api/v1/cd/services/#{service.id}", %{
        helm: %{values: "foo: bar"},
        name: service.name,
        namespace: service.namespace
      })
      |> json_response(403)
    end
  end

  describe "#delete/2" do
    test "it can delete a service", %{conn: conn} do
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])
      service = insert(:service, cluster: cluster, write_bindings: [%{user_id: user.id}])

      result =
        conn
        |> add_auth_headers(user)
        |> delete("/api/v1/cd/services/#{service.id}")
        |> json_response(200)

      assert result["id"] == service.id
      assert refetch(service).deleted_at
    end

    test "it can detach a service", %{conn: conn} do
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])
      service = insert(:service, cluster: cluster, write_bindings: [%{user_id: user.id}])

      result =
        conn
        |> add_auth_headers(user)
        |> delete("/api/v1/cd/services/#{service.id}?detach=true")
        |> json_response(200)

      assert result["id"] == service.id
      refute refetch(service)
    end

    test "non-writers cannot delete a service", %{conn: conn} do
      user = insert(:user)
      service = insert(:service)

      conn
      |> add_auth_headers(user)
      |> delete("/api/v1/cd/services/#{service.id}")
      |> json_response(403)
    end
  end
end
