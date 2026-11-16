defmodule ConsoleWeb.OIDCControllerTest do
  use ConsoleWeb.ConnCase, async: true
  alias Console.WorkloadIdentity

  describe "discovery and jwks" do
    test "they are public for an enabled issuer", %{conn: conn} do
      devbox = insert(:devbox)
      {:ok, _} = WorkloadIdentity.ensure_issuer("devboxes", devbox.id)

      doc =
        conn
        |> get("/oidc/devboxes/#{devbox.id}/.well-known/openid-configuration")
        |> json_response(200)

      assert doc["issuer"] == WorkloadIdentity.issuer_url("devboxes", devbox.id)
      assert doc["jwks_uri"] == "#{doc["issuer"]}/jwks"

      %{"keys" => [key]} =
        conn
        |> get("/oidc/devboxes/#{devbox.id}/jwks")
        |> json_response(200)

      assert key["kty"] == "RSA"
      refute key["d"]
    end

    test "disabled and unknown issuers are not found", %{conn: conn} do
      devbox = insert(:devbox)
      {:ok, _} = WorkloadIdentity.ensure_issuer("devboxes", devbox.id)
      {:ok, _} = WorkloadIdentity.disable_issuer("devboxes", devbox.id)

      conn
      |> get("/oidc/devboxes/#{devbox.id}/jwks")
      |> json_response(404)

      conn
      |> get("/oidc/devboxes/#{Ecto.UUID.generate()}/.well-known/openid-configuration")
      |> json_response(404)

      conn
      |> get("/oidc/devboxes/not-a-uuid/jwks")
      |> json_response(404)
    end
  end
end
