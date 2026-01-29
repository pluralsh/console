defmodule ConsoleWeb.OpenAPI.CD.ClusterUpgradeControllerTest do
  use ConsoleWeb.ConnCase, async: true
  use Mimic

  describe "#show/2" do
    test "returns the upgrade if you can read", %{conn: conn} do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])
      upgrade = insert(:cluster_upgrade, cluster: cluster, user: user)
      insert(:cluster_upgrade_step, upgrade: upgrade)

      result =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/cd/clusterupgrade/#{upgrade.id}")
        |> json_response(200)

      assert result["id"] == upgrade.id
      assert result["status"] == to_string(upgrade.status)
      assert length(result["steps"]) == 1
    end

    test "it 403s if you cannot read", %{conn: conn} do
      user = insert(:user)
      cluster = insert(:cluster)
      upgrade = insert(:cluster_upgrade, cluster: cluster, user: user)

      conn
      |> add_auth_headers(insert(:user))
      |> get("/v1/api/cd/clusterupgrade/#{upgrade.id}")
      |> json_response(403)
    end
  end

  describe "#create/2" do
    test "it can create a cluster upgrade", %{conn: conn} do
      user = insert(:user)
      cluster = insert(:cluster, current_version: "1.24", write_bindings: [%{user_id: user.id}])

      result =
        conn
        |> add_auth_headers(user)
        |> json_post("/v1/api/cd/clusters/#{cluster.id}/upgrade", %{})
        |> json_response(200)

      assert result["id"]
      assert result["cluster_id"] == cluster.id
      assert result["status"] == "pending"
    end

    test "non-writers cannot create a cluster upgrade", %{conn: conn} do
      cluster = insert(:cluster, current_version: "1.24")

      conn
      |> add_auth_headers(insert(:user))
      |> json_post("/v1/api/cd/clusters/#{cluster.id}/upgrade", %{})
      |> json_response(403)
    end
  end
end
