defmodule ConsoleWeb.OpenAPI.UserControllerTest do
  use ConsoleWeb.ConnCase, async: true
  use Mimic

  describe "#me/2" do
    test "returns the current user", %{conn: conn} do
      user = insert(:user)

      result =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/me")
        |> json_response(200)

      assert result["id"] == user.id
      assert result["email"] == user.email
      refute result["service_account"]
    end
  end
end
