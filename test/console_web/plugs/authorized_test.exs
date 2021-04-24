defmodule ConsoleWeb.Plugs.AuthorizedTest do
  use ConsoleWeb.ConnCase, async: true
  alias ConsoleWeb.Plugs.Authorized

  describe "#call/2" do
    test "It will validate against the configured webhook token, and set the grafana_token cookie", %{conn: conn} do
      user = insert(:user)
      conn = add_auth_headers(conn, user)
      result = Authorized.call(conn, [])

      refute result.status == 401
      %{"grafana_token" => %{value: val}} = result.resp_cookies

      {:ok, _} = Console.Guardian.decode_and_verify(val)
    end
  end
end
