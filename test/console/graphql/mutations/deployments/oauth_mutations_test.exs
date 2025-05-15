defmodule Console.GraphQl.Deployments.OAuthMutationsTest do
  use Console.DataCase, async: true
  use Mimic

  describe "createOidcProvider" do
    test "it can create a plural oidc provider" do
      attrs = %{
        "name" => "test",
        "description" => "test provider",
        "redirectUris" => ["https://example.com"]
      }
      expect(HTTPoison, :post, fn _, _, _ ->
        {:ok, %HTTPoison.Response{body: Jason.encode!(%{data: %{"createOidcProvider" => Map.merge(
          attrs,
          %{"id" => "id", "clientId" => "test-id", "clientSecret" => "test-secret"}
        )}})}}
      end)

      {:ok, %{data: %{"createOidcProvider" => provider}}} = run_query("""
        mutation Create($attrs: OidcProviderAttributes!) {
          createOidcProvider(type: PLURAL, attributes: $attrs) {
            id
            clientId
            clientSecret
            redirectUris
            bindings {
              user { id }
              group { id }
            }
            writeBindings {
              user { id }
              group { id }
            }
          }
        }
      """, %{"attrs" => attrs}, %{current_user: admin_user()})

      assert provider["clientId"] == "test-id"
      assert provider["clientSecret"] == "test-secret"
      assert provider["redirectUris"] == ["https://example.com"]
    end
  end
end
