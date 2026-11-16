defmodule Console.WorkloadIdentityTest do
  use Console.DataCase, async: true
  alias Console.WorkloadIdentity
  alias Console.WorkloadIdentity.Snippets
  alias Console.Schema.{Devbox, WorkloadIdentityKey}

  @aws "sts.amazonaws.com"

  setup do
    devbox = insert(:devbox, cloud_identities: [
      %Devbox.CloudIdentity{name: "aws", provider: :aws, role_arn: "arn:aws:iam::123456789012:role/devbox-role"},
      %Devbox.CloudIdentity{name: "gcp", provider: :gcp, workload_identity_provider: "projects/123/locations/global/workloadIdentityPools/pool/providers/prov", service_account: "sa@p.iam.gserviceaccount.com"}
    ])
    {:ok, issuer} = WorkloadIdentity.ensure_issuer("devboxes", devbox.id)
    {:ok, devbox: devbox, issuer: issuer}
  end

  describe "ensure_issuer/2" do
    test "it is idempotent and has one active key", %{devbox: devbox, issuer: issuer} do
      {:ok, again} = WorkloadIdentity.ensure_issuer("devboxes", devbox.id)

      assert again.id == issuer.id
      assert [%WorkloadIdentityKey{state: :active}] = Console.Repo.all(WorkloadIdentityKey.for_issuer(issuer.id))
    end

    test "unknown scopes are rejected" do
      {:error, _} = WorkloadIdentity.ensure_issuer("nope", Ecto.UUID.generate())
    end
  end

  describe "discovery/1 and jwks/1" do
    test "discovery points at the jwks", %{devbox: devbox, issuer: issuer} do
      doc = WorkloadIdentity.discovery(issuer)
      url = WorkloadIdentity.issuer_url("devboxes", devbox.id)

      assert doc["issuer"] == url
      assert doc["jwks_uri"] == "#{url}/jwks"
      assert doc["id_token_signing_alg_values_supported"] == ["RS256"]
      assert "https://aws.amazon.com/tags" in doc["claims_supported"]
    end

    test "the jwks only has public keys", %{issuer: issuer} do
      %{"keys" => [key]} = WorkloadIdentity.jwks(issuer)

      assert key["kty"] == "RSA"
      assert key["alg"] == "RS256"
      assert key["use"] == "sig"
      assert key["kid"]
      refute Map.has_key?(key, "d")
      refute Map.has_key?(key, "p")
    end
  end

  describe "mint/2" do
    test "tokens verify against the published jwks", %{devbox: devbox, issuer: issuer} do
      {:ok, token, claims} = WorkloadIdentity.mint({"devboxes", devbox.id}, %{
        subject: "devbox:#{devbox.name}",
        audience: @aws,
        claims: %{"instance" => "i-1", "https://aws.amazon.com/tags" => %{"principal_tags" => %{"devbox" => [devbox.name]}}}
      })

      assert claims["iss"] == WorkloadIdentity.issuer_url("devboxes", devbox.id)
      assert claims["sub"] == "devbox:#{devbox.name}"
      assert claims["aud"] == @aws
      assert claims["instance"] == "i-1"
      assert claims["exp"] - claims["iat"] == 600

      assert verify(token, issuer)
      %JOSE.JWS{fields: %{"kid" => kid}} = JOSE.JWT.peek_protected(token)
      assert Enum.any?(WorkloadIdentity.jwks(issuer)["keys"], & &1["kid"] == kid)
    end

    test "the scope validates subject, audience, claims and ttl", %{devbox: devbox} do
      sub = "devbox:#{devbox.name}"
      scope = {"devboxes", devbox.id}

      {:error, _} = WorkloadIdentity.mint(scope, %{subject: "devbox:other", audience: @aws})
      {:error, _} = WorkloadIdentity.mint(scope, %{subject: sub, audience: "https://evil.example.com"})
      {:error, _} = WorkloadIdentity.mint(scope, %{subject: sub, audience: @aws, claims: %{"admin" => true}})
      {:error, _} = WorkloadIdentity.mint(scope, %{subject: sub, audience: @aws, ttl: 2 * 60 * 60})

      gcp = "//iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/pool/providers/prov"
      {:ok, _, %{"aud" => ^gcp}} = WorkloadIdentity.mint(scope, %{subject: sub, audience: gcp, ttl: 3600})
    end

    test "disabled issuers mint nothing and publish no keys", %{devbox: devbox} do
      {:ok, issuer} = WorkloadIdentity.disable_issuer("devboxes", devbox.id)

      {:error, _} = WorkloadIdentity.mint({"devboxes", devbox.id}, %{subject: "devbox:#{devbox.name}", audience: @aws})
      assert WorkloadIdentity.jwks(issuer) == %{"keys" => []}
      refute WorkloadIdentity.get_enabled_issuer("devboxes", devbox.id)
    end
  end

  describe "rotation" do
    test "a pending key is published ahead, then promoted, and the old key stays until tokens expire", %{devbox: devbox, issuer: issuer} do
      [active] = keys(issuer)
      {:ok, old_token, _} = WorkloadIdentity.mint({"devboxes", devbox.id}, %{subject: "devbox:#{devbox.name}", audience: @aws})

      age(active, 30 * 24 * 60 * 60)
      {:ok, _} = WorkloadIdentity.rotate(issuer)
      assert [%{state: :active}, %{state: :pending} = pending] = keys(issuer)
      assert length(WorkloadIdentity.jwks(issuer)["keys"]) == 2

      age(pending, 2 * 24 * 60 * 60)
      {:ok, _} = WorkloadIdentity.rotate(issuer)
      states = keys(issuer) |> Map.new(& {&1.id, &1.state})
      assert states[pending.id] == :active
      assert states[active.id] == :retired

      assert verify(old_token, issuer)
      {:ok, new_token, _} = WorkloadIdentity.mint({"devboxes", devbox.id}, %{subject: "devbox:#{devbox.name}", audience: @aws})
      %JOSE.JWS{fields: %{"kid" => kid}} = JOSE.JWT.peek_protected(new_token)
      assert kid == pending.kid
    end

    test "emergency rotation revokes every old key", %{devbox: devbox, issuer: issuer} do
      {:ok, old_token, _} = WorkloadIdentity.mint({"devboxes", devbox.id}, %{subject: "devbox:#{devbox.name}", audience: @aws})

      {:ok, _} = WorkloadIdentity.rotate_now(issuer)

      assert [_] = WorkloadIdentity.jwks(issuer)["keys"]
      refute verify(old_token, issuer)
    end
  end

  describe "Snippets.devbox/1" do
    test "it renders trust setup for each cloud", %{devbox: devbox} do
      %{issuer_url: url, subject: sub, snippets: snippets, audiences: auds} = Snippets.devbox(devbox)

      assert sub == "devbox:#{devbox.name}"
      assert @aws in auds
      assert "//iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/pool/providers/prov" in auds

      aws = Enum.find(snippets, & &1.provider == :aws && &1.format == :terraform)
      assert aws.content =~ url
      assert aws.content =~ "devbox-role"
      assert aws.content =~ sub

      gcp = Enum.find(snippets, & &1.provider == :gcp && &1.format == :cli)
      assert gcp.content =~ "providers create-oidc prov"
      assert gcp.content =~ "sa@p.iam.gserviceaccount.com"

      assert Enum.find(snippets, & &1.provider == :azure && &1.format == :cli).content =~ "api://AzureADTokenExchange"
    end
  end

  defp keys(issuer) do
    WorkloadIdentityKey.for_issuer(issuer.id)
    |> WorkloadIdentityKey.ordered(asc: :inserted_at)
    |> Console.Repo.all()
  end

  defp age(key, secs) do
    at = DateTime.add(DateTime.utc_now(), -secs, :second)
    key
    |> Ecto.Changeset.change(%{inserted_at: at, activated_at: key.activated_at && at})
    |> Console.Repo.update!()
  end

  defp verify(token, issuer) do
    WorkloadIdentity.jwks(issuer)["keys"]
    |> Enum.any?(fn jwk ->
      case JOSE.JWT.verify_strict(JOSE.JWK.from_map(jwk), ["RS256"], token) do
        {true, _, _} -> true
        _ -> false
      end
    end)
  end
end
