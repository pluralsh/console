defmodule ConsoleWeb.OpenAPI.ServiceAccountControllerTest do
  use ConsoleWeb.ConnCase, async: true
  use Mimic

  describe "#index/2" do
    test "returns the list of service accounts", %{conn: conn} do
      user = admin_user()
      accounts = insert_list(3, :user, service_account: true)
      insert_list(2, :user)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/serviceaccounts")
        |> json_response(200)

      assert ids_equal(results, accounts)
    end

    test "supports pagination", %{conn: conn} do
      user = admin_user()
      insert_list(5, :user, service_account: true)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/serviceaccounts?page=1&per_page=2")
        |> json_response(200)

      assert length(results) == 2
    end

    test "searches by q parameter", %{conn: conn} do
      user = admin_user()
      account = insert(:user, service_account: true, email: "matching@plural.sh")
      insert(:user, service_account: true, email: "other@plural.sh")

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/serviceaccounts?q=matching")
        |> json_response(200)

      assert length(results) == 1
      assert hd(results)["id"] == account.id
    end
  end

  describe "#show/2" do
    test "returns the service account by id", %{conn: conn} do
      user = admin_user()
      account = insert(:user, service_account: true)

      result =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/serviceaccounts/#{account.id}")
        |> json_response(200)

      assert result["id"] == account.id
      assert result["email"] == account.email
      assert result["service_account"]
    end
  end

  describe "#show_by_email/2" do
    test "returns the service account by email", %{conn: conn} do
      user = admin_user()
      account = insert(:user, service_account: true, email: "sa@example.com")

      result =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/serviceaccounts/email/#{URI.encode(account.email)}")
        |> json_response(200)

      assert result["id"] == account.id
      assert result["email"] == account.email
    end
  end

  describe "#token/2" do
    test "creates a service account access token", %{conn: conn} do
      user = insert(:user)
      account = insert(:user, service_account: true, assume_bindings: [%{user_id: user.id}])

      result =
        conn
        |> add_auth_headers(user)
        |> json_post("/v1/api/serviceaccounts/#{account.id}/token?refresh=true", %{
          expiry: "1h",
          scopes: [%{api: "updateServiceDeployment", identifier: Ecto.UUID.generate()}]
        })
        |> json_response(200)

      assert result["token"]
      assert result["expires_at"]
    end
  end
end
