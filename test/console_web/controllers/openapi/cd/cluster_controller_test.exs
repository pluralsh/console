defmodule ConsoleWeb.OpenAPI.CD.ClusterControllerTest do
  use ConsoleWeb.ConnCase, async: true
  use Mimic

  describe "#show/2" do
    test "returns the cluster if you can read", %{conn: conn} do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])

      result =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/cd/clusters/#{cluster.id}")
        |> json_response(200)

      assert result["id"] == cluster.id
      assert result["name"] == cluster.name
      assert result["distro"] == to_string(cluster.distro)
    end

    test "it 403s if you cannot read", %{conn: conn} do
      user = insert(:user)
      cluster = insert(:cluster)

      conn
      |> add_auth_headers(user)
      |> get("/api/v1/cd/clusters/#{cluster.id}")
      |> json_response(403)
    end
  end

  describe "#list/2" do
    test "returns the list of clusters", %{conn: conn} do
      user = insert(:user)
      clusters = insert_list(3, :cluster, read_bindings: [%{user_id: user.id}])
      insert_list(3, :cluster)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/cd/clusters")
        |> json_response(200)

      assert ids_equal(results, clusters)
    end
  end

  describe "#create/2" do
    test "it can create a cluster", %{conn: conn} do
      insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")
      # expect(Console.Features, :available?, fn :cd -> true end)

      result =
        conn
        |> add_auth_headers(admin_user())
        |> json_post("/api/v1/cd/clusters", %{name: "test", handle: "test", metadata: %{"blah" => "blah"}})
        |> json_response(200)

      assert result["id"]
      assert result["name"] == "test"
      assert result["handle"] == "test"
      assert result["metadata"] == %{"blah" => "blah"}
    end

    test "non-writers cannot create a cluster", %{conn: conn} do
      insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")
      # expect(Console.Features, :available?, fn :cd -> true end)

      conn
      |> add_auth_headers(insert(:user))
      |> json_post("/api/v1/cd/clusters", %{name: "test", handle: "test", metadata: %{"blah" => "blah"}})
      |> json_response(403)
    end
  end

  describe "#update/2" do
    test "it can update a cluster", %{conn: conn} do
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])

      result =
        conn
        |> add_auth_headers(user)
        |> json_put("/api/v1/cd/clusters/#{cluster.id}", %{name: "new-name", handle: "test", metadata: %{"blah" => "blah"}})
        |> json_response(200)

      assert result["id"] == cluster.id
      assert result["name"] == "new-name"
      assert result["handle"] == "test"
      assert result["metadata"] == %{"blah" => "blah"}
    end

    test "non-writers cannot update a cluster", %{conn: conn} do
      user = insert(:user)
      cluster = insert(:cluster)

      conn
      |> add_auth_headers(user)
      |> json_put("/api/v1/cd/clusters/#{cluster.id}", %{name: "test", handle: "test", metadata: %{"blah" => "blah"}})
      |> json_response(403)
    end
  end

  describe "#delete/2" do
    test "it can delete a cluster", %{conn: conn} do
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])

      result =
        conn
        |> add_auth_headers(user)
        |> delete("/api/v1/cd/clusters/#{cluster.id}")
        |> json_response(200)

      assert result["id"] == cluster.id
      assert refetch(cluster).deleted_at
    end

    test "it can detach a cluster", %{conn: conn} do
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])

      result =
        conn
        |> add_auth_headers(user)
        |> delete("/api/v1/cd/clusters/#{cluster.id}?detach=true")
        |> json_response(200)

      assert result["id"] == cluster.id
      refute refetch(cluster)
    end

    test "non-writers cannot delete a cluster", %{conn: conn} do
      user = insert(:user)
      cluster = insert(:cluster)

      conn
      |> add_auth_headers(user)
      |> delete("/api/v1/cd/clusters/#{cluster.id}")
      |> json_response(403)
    end
  end
end
