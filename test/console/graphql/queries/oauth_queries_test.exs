defmodule Console.GraphQl.OAuthQueriesTest do
  use Console.DataCase, async: true
  use Mimic

  describe "oidcLogin" do
    test "it can fetch an oauth login's details" do
      provider = insert(:oidc_provider)
      expect(HTTPoison, :get, fn _, _ ->
        body = Jason.encode!(%{client: %{client_id: provider.client_id}, requested_scope: ["openid"]})
        {:ok, %{status_code: 200, body: body}}
      end)

      {:ok, %{data: %{"oidcLogin" => result}}} = run_query("""
        query Login($challenge: String!) {
          oidcLogin(challenge: $challenge) {
            login { requestedScope }
          }
        }
      """, %{"challenge" => "challenge"})

      assert result["login"]["requestedScope"] == ["openid"]
    end
  end

  describe "oidcConsent" do
    test "it can fetch an oauth login's details" do
      provider = insert(:oidc_provider)
      expect(HTTPoison, :get, fn _, _ ->
        body = Jason.encode!(%{client: %{client_id: provider.client_id}, requested_scope: ["openid"]})
        {:ok, %{status_code: 200, body: body}}
      end)

      {:ok, %{data: %{"oidcConsent" => result}}} = run_query("""
        query Login($challenge: String!) {
          oidcConsent(challenge: $challenge) {
            consent { requestedScope }
          }
        }
      """, %{"challenge" => "challenge"})

      assert result["consent"]["requestedScope"] == ["openid"]
    end
  end
end
