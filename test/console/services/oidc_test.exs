defmodule Console.Services.OIDCTest do
  use Console.DataCase, async: true
  alias Console.Services.OIDC
  use Mimic

  describe "#create_oidc_provider/2" do
    test "admins can create an oidc provider" do
      group = insert(:group)
      expect(HTTPoison, :post, fn _, _, _ ->
        {:ok, %{status_code: 200, body: Jason.encode!(%{client_id: "123", client_secret: "secret"})}}
      end)
      user = insert(:user)

      {:ok, oidc} = OIDC.create_oidc_provider(%{
        name: "test",
        redirect_uris: ["https://example.com"],
        auth_method: :basic,
        bindings: [%{user_id: user.id}, %{group_id: group.id}]
      }, admin_user())

      assert oidc.client_id == "123"
      assert oidc.client_secret == "secret"
      assert oidc.redirect_uris == ["https://example.com"]

      [first, second] = oidc.bindings

      assert first.user_id == user.id
      assert second.group_id == group.id
    end
  end

  describe "#update_oidc_provider/2" do
    test "admins can update your own providers" do
      user = admin_user()
      oidc = insert(:oidc_provider)
      expect(HTTPoison, :put, fn _, _, _ ->
        {:ok, %{status_code: 200, body: Jason.encode!(%{client_id: "123", client_secret: "secret"})}}
      end)

      {:ok, updated} = OIDC.update_oidc_provider(%{
        redirect_uris: ["https://example.com"],
        auth_method: :basic
      }, oidc.id, user)

      assert updated.id == oidc.id
      assert updated.auth_method == :basic
    end

    test "writers can update providers" do
      user = insert(:user)
      oidc = insert(:oidc_provider, write_bindings: [%{user_id: user.id}])
      expect(HTTPoison, :put, fn _, _, _ ->
        {:ok, %{status_code: 200, body: Jason.encode!(%{client_id: "123", client_secret: "secret"})}}
      end)

      {:ok, updated} = OIDC.update_oidc_provider(%{
        redirect_uris: ["https://example.com"],
        auth_method: :basic
      }, oidc.id, user)

      assert updated.id == oidc.id
      assert updated.auth_method == :basic
    end

    test "others cannot update your provider" do
      oidc = insert(:oidc_provider)

      {:error, _} = OIDC.update_oidc_provider(%{
        redirect_uris: ["https://example.com"],
        auth_method: :basic
      }, oidc.id, insert(:user))
    end
  end

  describe "#delete_oidc_provider/2" do
    test "admins can delete providers" do
      user = admin_user()
      oidc = insert(:oidc_provider)
      expect(HTTPoison, :delete, fn _, _ -> {:ok, %{status_code: 204, body: ""}} end)

      {:ok, deleted} = OIDC.delete_oidc_provider(oidc.id, user)

      assert deleted.id == oidc.id
      refute refetch(deleted)
    end

    test "others cannot delete your provider" do
      oidc = insert(:oidc_provider)

      {:error, _} = OIDC.delete_oidc_provider(oidc.id, insert(:user))
    end
  end

  describe "#get_login/1" do
    test "It can get information related to an OIDC login" do
      provider = insert(:oidc_provider)
      expect(HTTPoison, :get, fn _, _ ->
        body = Jason.encode!(%{client: %{client_id: provider.client_id}})
        {:ok, %{status_code: 200, body: body}}
      end)

      {:ok, result} = OIDC.get_login("challenge")

      assert result.id == provider.id
    end
  end

  describe "#handle_login/2" do
    test "If a user is bound by a provider, they can log in" do
      %{id: id} = user = insert(:user)
      provider = insert(:oidc_provider, bindings: [%{user_id: id}])

      expect(HTTPoison, :get, fn _, _ ->
        body = Jason.encode!(%{client: %{client_id: provider.client_id}})
        {:ok, %{status_code: 200, body: body}}
      end)

      expect(HTTPoison, :put, fn _, body, _ ->
        resp = Jason.encode!(%{redirect_to: "example.com"})
        case Jason.decode!(body) do
          %{"subject" => ^id} -> {:ok, %{status_code: 200, body: resp}}
          _ -> {:error, :invalid}
        end
      end)

      {:ok, %{redirect_to: url}} = OIDC.handle_login("challenge", user)

      assert url == "example.com"
    end

    test "if a user is not bound, the login is rejected" do
      %{id: id} = user = insert(:user)
      provider = insert(:oidc_provider)

      expect(HTTPoison, :get, fn _, _ ->
        body = Jason.encode!(%{client: %{client_id: provider.client_id}})
        {:ok, %{status_code: 200, body: body}}
      end)

      expect(HTTPoison, :put, fn _, body, _ ->
        resp = Jason.encode!(%{redirect_url: "example.com"})
        case Jason.decode!(body) do
          %{"subject" => ^id} -> {:error, :invalid}
          _ -> {:ok, %{status_code: 200, body: resp}}
        end
      end)

      {:ok, %{redirect_to: _}} = OIDC.handle_login("challenge", user)
    end
  end

  describe "#consent/3" do
    test "it will accept an OIDC consent request" do
      me = self()
      user = insert(:user, roles: %{admin: true})
      provider = insert(:oidc_provider)
      expect(HTTPoison, :put, fn _, body, _ ->
        send(me, {:body, Jason.decode!(body)})
        {:ok, %{status_code: 200, body: Jason.encode!(%{redirect_to: "example.com"})}}
      end)

      expect(HTTPoison, :get, fn _, _ ->
        {:ok, %{status_code: 200, body: Jason.encode!(%{client: %{client_id: provider.client_id}})}}
      end)

      {:ok, %{redirect_to: _}} = OIDC.consent("challenge", "profile", user)

      assert_receive {:body, %{
        "session" => %{"id_token" => %{"groups" => _, "name" => _, "profile" => _, "admin" => true}}
      }}
    end
  end
end
