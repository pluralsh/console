defmodule ConsoleWeb.Plugs.DeployTokenTest do
  use ConsoleWeb.ConnCase, async: true
  alias ConsoleWeb.Plugs.DeployToken

  describe "#call/2" do
    test "It fetch a deploy token if present", %{conn: conn} do
      cluster = insert(:cluster, deploy_token: "deploy-adfafdsa")
      conn = put_req_header(conn, "authorization", "Token #{cluster.deploy_token}")
      conn = DeployToken.call(conn, [])

      found = DeployToken.get_cluster(conn)

      assert found.id == cluster.id
    end
  end
end
