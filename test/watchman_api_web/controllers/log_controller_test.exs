defmodule WatchmanWeb.LogControllerTest do
  use WatchmanWeb.ConnCase, async: true
  use Mimic

  describe "#download/2" do
    test "it will download logs for a permitted user", %{conn: conn} do
      admin = insert(:user, roles: %{admin: true})
      expect(HTTPoison, :get, 2, fn url ->
        URI.parse(url)
        |> Map.get(:query)
        |> URI.decode_query()
        |> case do
          %{"end" => "2"} ->
            {:ok, %HTTPoison.Response{status_code: 200, body: Poison.encode!(%{data: %{result: []}})}}
          _ ->
            {:ok, %HTTPoison.Response{status_code: 200, body: Poison.encode!(%{data: %{result: [
                %{stream: %{"var" => "val"}, values: [["1", "hello"]]},
                %{stream: %{"var" => "val2"}, values: [["1", "world"]]}
              ]}}
            )}}
        end
      end)

      conn
      |> add_auth_headers(admin)
      |> get("/v1/logs/repo/download", %{q: "{app=\"repo\"}", end: "5"})
      |> response(200)
    end

    test "non-permitted are 403'ed", %{conn: conn} do
      user = insert(:user)

      conn
      |> add_auth_headers(user)
      |> get("/v1/logs/repo/download")
      |> response(403)
    end
  end
end