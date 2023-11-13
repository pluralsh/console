defmodule ConsoleWeb.Plugs.TokenTest do
  use ConsoleWeb.ConnCase, async: true
  alias ConsoleWeb.Plugs.Token

  describe "#call/2" do
    test "It fetch a deploy token if present", %{conn: conn} do
      cluster = insert(:cluster, deploy_token: "deploy-adfafdsa")
      conn = put_req_header(conn, "authorization", "Token #{cluster.deploy_token}")
      conn = Token.call(conn, [])

      found = Token.get_cluster(conn)

      assert found.id == cluster.id
    end

    test "it can handle access tokens", %{conn: conn} do
      access = insert(:access_token)
      conn = add_auth_headers(conn, access)
      Token.call(conn, [])

      assert_receive {:event, %Console.PubSub.AccessTokenUsage{item: token}}
      assert token.id == access.id
    end
  end
end
