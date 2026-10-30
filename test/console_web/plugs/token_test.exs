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

    test "it caches invalid access tokens instead of querying the database repeatedly", %{conn: conn} do
      token = "console-#{Console.rand_alphanum(30)}"
      conn = put_req_header(conn, "authorization", "Token #{token}")
      handler = "invalid-access-token-#{inspect(self())}"

      :telemetry.attach(
        handler,
        [:console, :repo, :query],
        &__MODULE__.forward_access_token_query/4,
        self()
      )

      on_exit(fn ->
        :telemetry.detach(handler)
        Console.Cache.delete({:access, token})
      end)

      Token.call(conn, [])
      Token.call(conn, [])

      assert_receive {:access_token_query, _}
      refute_receive {:access_token_query, _}
    end
  end

  def forward_access_token_query(_event, _measurements, %{query: query}, pid) do
    if self() == pid and query =~ ~s(FROM "access_tokens"),
      do: send(pid, {:access_token_query, query})
  end
end
