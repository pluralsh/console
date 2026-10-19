defmodule Console.Schema.FederatedCredentialTest do
  use ExUnit.Case, async: true

  alias Console.Schema.FederatedCredential

  describe "allow?/2" do
    test "it matches string claims against their regex" do
      cred = %FederatedCredential{claims_like: %{"sub" => "^repo:pluralsh/console:ref:refs/heads/master$"}}

      assert FederatedCredential.allow?(cred, %{"sub" => "repo:pluralsh/console:ref:refs/heads/master"})
      refute FederatedCredential.allow?(cred, %{"sub" => "repo:pluralsh/console:ref:refs/heads/master-evil"})
    end

    test "it anchors regexes implicitly" do
      cred = %FederatedCredential{claims_like: %{"sub" => "repo:pluralsh/console:ref:refs/heads/master"}}

      assert FederatedCredential.allow?(cred, %{"sub" => "repo:pluralsh/console:ref:refs/heads/master"})
      refute FederatedCredential.allow?(cred, %{"sub" => "repo:pluralsh/console:ref:refs/heads/master-evil"})
      refute FederatedCredential.allow?(cred, %{"sub" => "evil-repo:pluralsh/console:ref:refs/heads/master"})

      cred = %FederatedCredential{claims_like: %{"sub" => "pluralsh/console"}}
      refute FederatedCredential.allow?(cred, %{"sub" => "repo:pluralsh/console:ref:refs/heads/master"})

      cred = %FederatedCredential{claims_like: %{"sub" => ".*pluralsh/console.*"}}
      assert FederatedCredential.allow?(cred, %{"sub" => "repo:pluralsh/console:ref:refs/heads/master"})
    end

    test "it anchors every branch of an alternation" do
      cred = %FederatedCredential{claims_like: %{"sub" => "main|master"}}

      assert FederatedCredential.allow?(cred, %{"sub" => "main"})
      assert FederatedCredential.allow?(cred, %{"sub" => "master"})
      refute FederatedCredential.allow?(cred, %{"sub" => "main-evil"})
      refute FederatedCredential.allow?(cred, %{"sub" => "evil-master"})
    end

    test "it doesn't let unbalanced patterns escape the anchors" do
      cred = %FederatedCredential{claims_like: %{"sub" => "x)|(?:.*"}}

      refute FederatedCredential.allow?(cred, %{"sub" => "anything"})
    end

    test "it matches list claims if any value matches" do
      cred = %FederatedCredential{claims_like: %{"aud" => "^plural$"}}

      assert FederatedCredential.allow?(cred, %{"aud" => ["plural"]})
      assert FederatedCredential.allow?(cred, %{"aud" => ["other", "plural"]})
      refute FederatedCredential.allow?(cred, %{"aud" => ["other"]})
      refute FederatedCredential.allow?(cred, %{"aud" => []})
    end

    test "it matches scalar claims by their string form" do
      cred = %FederatedCredential{claims_like: %{"admin" => "^true$", "n" => "^4\\d$"}}

      assert FederatedCredential.allow?(cred, %{"admin" => true, "n" => 42})
      refute FederatedCredential.allow?(cred, %{"admin" => false, "n" => 42})
    end

    test "it rejects object claims and missing claims rather than raising" do
      cred = %FederatedCredential{claims_like: %{"kubernetes.io" => ".*"}}

      refute FederatedCredential.allow?(cred, %{"kubernetes.io" => %{"namespace" => "default"}})
      refute FederatedCredential.allow?(cred, %{})
    end
  end

  describe "changeset/2" do
    test "it rejects invalid and unbalanced regexes" do
      for pattern <- ["(", "x)|(?:.*"] do
        cs =
          FederatedCredential.changeset(%FederatedCredential{}, %{
            issuer: "https://token.actions.githubusercontent.com",
            claims_like: %{"sub" => pattern},
            scopes: ["catalog.write"],
            user_id: Ecto.UUID.generate()
          })

        refute cs.valid?
        assert cs.errors[:claims_like]
      end
    end
  end
end
