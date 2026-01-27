defmodule ConsoleWeb.OpenAPI.CD.ClusterControllerTest do
  use ConsoleWeb.ConnCase, async: true
  use Mimic

  alias Console.Schema.{UpgradeInsight, UpgradeInsightDetail}
  alias Console.Repo

  describe "#show/2" do
    test "returns the cluster if you can read", %{conn: conn} do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])

      result =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/cd/clusters/#{cluster.id}")
        |> json_response(200)

      assert result["id"] == cluster.id
      assert result["name"] == cluster.name
      assert result["distro"] == to_string(cluster.distro)
    end

    test "returns upgrade_plan when present", %{conn: conn} do
      user = insert(:user)
      cluster = insert(:cluster,
        read_bindings: [%{user_id: user.id}],
        upgrade_plan: %{
          compatibilities: true,
          incompatibilities: true,
          deprecations: false,
          kubelet_skew: true
        }
      )

      result =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/cd/clusters/#{cluster.id}")
        |> json_response(200)

      assert result["id"] == cluster.id
      assert result["upgrade_plan"]["compatibilities"] == true
      assert result["upgrade_plan"]["incompatibilities"] == true
      assert result["upgrade_plan"]["deprecations"] == false
      assert result["upgrade_plan"]["kubelet_skew"] == true
    end

    test "it 403s if you cannot read", %{conn: conn} do
      user = insert(:user)
      cluster = insert(:cluster)

      conn
      |> add_auth_headers(user)
      |> get("/v1/api/cd/clusters/#{cluster.id}")
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
        |> get("/v1/api/cd/clusters")
        |> json_response(200)

      assert ids_equal(results, clusters)
    end

    test "filters by project_id", %{conn: conn} do
      user = insert(:user)
      project1 = insert(:project)
      project2 = insert(:project)
      clusters1 = insert_list(2, :cluster, project: project1, read_bindings: [%{user_id: user.id}])
      insert_list(2, :cluster, project: project2, read_bindings: [%{user_id: user.id}])

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/cd/clusters?project_id=#{project1.id}")
        |> json_response(200)

      assert ids_equal(results, clusters1)
    end

    test "searches by name with q parameter", %{conn: conn} do
      user = insert(:user)
      cluster1 = insert(:cluster, name: "matching-cluster", read_bindings: [%{user_id: user.id}])
      insert(:cluster, name: "other-cluster", read_bindings: [%{user_id: user.id}])

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/cd/clusters?q=matching")
        |> json_response(200)

      assert length(results) == 1
      assert hd(results)["id"] == cluster1.id
    end

    test "filters by tag", %{conn: conn} do
      user = insert(:user)
      cluster1 = insert(:cluster, read_bindings: [%{user_id: user.id}], tags: [%{name: "env", value: "prod"}])
      insert(:cluster, read_bindings: [%{user_id: user.id}], tags: [%{name: "env", value: "staging"}])

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/cd/clusters?tag=env:prod")
        |> json_response(200)

      assert length(results) == 1
      assert hd(results)["id"] == cluster1.id
    end

    test "returns project_id in cluster response", %{conn: conn} do
      user = insert(:user)
      project = insert(:project)
      cluster = insert(:cluster, project: project, read_bindings: [%{user_id: user.id}])

      result =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/cd/clusters/#{cluster.id}")
        |> json_response(200)

      assert result["id"] == cluster.id
      assert result["project_id"] == project.id
    end

    test "supports pagination", %{conn: conn} do
      user = insert(:user)
      insert_list(5, :cluster, read_bindings: [%{user_id: user.id}])

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/cd/clusters?page=1&per_page=2")
        |> json_response(200)

      assert length(results) == 2
    end
  end

  describe "#create/2" do
    test "it can create a cluster", %{conn: conn} do
      insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")

      result =
        conn
        |> add_auth_headers(admin_user())
        |> json_post("/v1/api/cd/clusters", %{
          name: "test",
          handle: "test",
          metadata: %{"blah" => "blah"}
        })
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
      |> json_post("/v1/api/cd/clusters", %{name: "test", handle: "test", metadata: %{"blah" => "blah"}})
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
        |> json_put("/v1/api/cd/clusters/#{cluster.id}", %{
          name: "new-name",
          handle: "test",
          metadata: %{"blah" => "blah"}
        })
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
      |> json_put("/v1/api/cd/clusters/#{cluster.id}", %{name: "test", handle: "test", metadata: %{"blah" => "blah"}})
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
        |> delete("/v1/api/cd/clusters/#{cluster.id}")
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
        |> delete("/v1/api/cd/clusters/#{cluster.id}?detach=true")
        |> json_response(200)

      assert result["id"] == cluster.id
      refute refetch(cluster)
    end

    test "non-writers cannot delete a cluster", %{conn: conn} do
      user = insert(:user)
      cluster = insert(:cluster)

      conn
      |> add_auth_headers(user)
      |> delete("/v1/api/cd/clusters/#{cluster.id}")
      |> json_response(403)
    end
  end

  describe "#upgrade_summary/2" do
    test "returns upgrade summary for a cluster", %{conn: conn} do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])

      result =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/cd/clusters/#{cluster.id}/upgradesummary")
        |> json_response(200)

      assert is_list(result["failed_insights"])
      assert is_list(result["blocking_addons"])
      assert is_list(result["blocking_cloud_addons"])
    end

    test "returns failed insights when present", %{conn: conn} do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])

      # Create a failed upgrade insight
      {:ok, insight} =
        %UpgradeInsight{}
        |> UpgradeInsight.changeset(%{
          name: "deprecated-api-test",
          version: "1.29",
          description: "Test deprecated API",
          status: :failed,
          cluster_id: cluster.id
        })
        |> Repo.insert()

      # Create an insight detail
      {:ok, _detail} =
        %UpgradeInsightDetail{}
        |> UpgradeInsightDetail.changeset(%{
          status: :failed,
          used: "/apis/networking.k8s.io/v1beta1/ingress",
          replacement: "/apis/networking.k8s.io/v1/ingress",
          replaced_in: "1.25",
          removed_in: "1.28",
          insight_id: insight.id
        })
        |> Repo.insert()

      result =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/cd/clusters/#{cluster.id}/upgradesummary")
        |> json_response(200)

      assert length(result["failed_insights"]) == 1
      [failed_insight] = result["failed_insights"]
      assert failed_insight["name"] == "deprecated-api-test"
      assert failed_insight["status"] == "failed"
      assert failed_insight["version"] == "1.29"
      assert length(failed_insight["details"]) == 1
    end

    test "it 403s if you cannot read", %{conn: conn} do
      user = insert(:user)
      cluster = insert(:cluster)

      conn
      |> add_auth_headers(user)
      |> get("/v1/api/cd/clusters/#{cluster.id}/upgradesummary")
      |> json_response(403)
    end
  end
end
