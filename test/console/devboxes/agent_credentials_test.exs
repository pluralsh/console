defmodule Console.Devboxes.AgentCredentialsTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.Devboxes
  alias Console.Devboxes.{AgentCredentials, Billing, Control, Credentials, Threads}
  alias Console.Schema.{AgentCredential, AppNotification, Workbench}

  @claude "sk-ant-oat01-" <> String.duplicate("x", 48)

  describe "link/2" do
    test "it validates shape, verifies once and stores metadata" do
      user = insert(:user)

      {:ok, cred} = AgentCredentials.link(%{kind: :claude_oauth_token, secret: "  #{@claude}\n", label: "mine"}, user)

      assert cred.provider == :claude
      assert cred.status == :valid
      assert cred.version == 1
      assert cred.metadata["email"] == "someone@example.com"
      assert refetch(cred).secret == @claude
    end

    test "it rejects malformed and vendor-rejected secrets" do
      user = insert(:user)

      {:error, _} = AgentCredentials.link(%{kind: :claude_oauth_token, secret: "sk-ant-api03-nope"}, user)
      {:error, _} = AgentCredentials.link(%{kind: :codex_chatgpt_auth, secret: "{}"}, user)
      {:error, _} = AgentCredentials.link(%{kind: :codex_chatgpt_auth, secret: "not json"}, user)
      {:error, _} = AgentCredentials.link(%{kind: :claude_oauth_token, secret: "sk-ant-oat01-rejected" <> String.duplicate("x", 40)}, user)

      assert Console.Repo.all(AgentCredential) == []
    end

    test "the live check runs exactly once" do
      user = insert(:user)
      expect(AgentCredentials.Verifier.Test, :verify, 1, fn :codex_access_token, _, meta -> {:ok, meta} end)

      {:ok, %{provider: :codex}} = AgentCredentials.link(%{kind: :codex_access_token, secret: String.duplicate("t", 32)}, user)
    end

    test "relinking a provider replaces the secret and bumps the version" do
      user = insert(:user)
      {:ok, first} = AgentCredentials.link(%{kind: :codex_chatgpt_auth, secret: bundle("a"), default_billing: true}, user)
      {:ok, second} = AgentCredentials.link(%{kind: :codex_access_token, secret: String.duplicate("t", 32)}, user)

      assert second.id == first.id
      assert second.kind == :codex_access_token
      assert second.version == 2
      assert second.default_billing
      assert [_] = AgentCredentials.list(user)
    end

    test "codex bundles carry their account metadata" do
      user = insert(:user)
      id_token = jwt(%{"email" => "dev@example.com", "https://api.openai.com/auth" => %{"chatgpt_plan_type" => "pro", "chatgpt_account_id" => "acct-1"}})
      secret = Jason.encode!(%{"tokens" => %{"access_token" => "at", "refresh_token" => "rt", "id_token" => id_token, "account_id" => "acct-1"}})

      {:ok, cred} = AgentCredentials.link(%{kind: :codex_chatgpt_auth, secret: secret}, user)

      assert cred.metadata["plan"] == "pro"
      assert cred.metadata["account_id"] == "acct-1"
    end
  end

  describe "delete/2 and set_default_billing/3" do
    test "only the owner can delete or change a credential" do
      cred = insert(:agent_credential)

      {:error, _} = AgentCredentials.delete(cred.id, insert(:user))
      {:error, _} = AgentCredentials.set_default_billing(:claude, true, insert(:user))
      {:ok, %{default_billing: true}} = AgentCredentials.set_default_billing(:claude, true, cred.user)
      {:ok, _} = AgentCredentials.delete(cred.id, cred.user)

      refute refetch(cred)
    end
  end

  describe "deliver/2" do
    test "it delivers the owner's credential to a subscription-billed instance" do
      %{inst: inst, cred: cred} = subscribed(:claude)

      {:ok, [delivered]} = Credentials.instance_credentials(inst, [%{kind: :claude_oauth}])

      assert delivered.kind == :claude_oauth
      assert delivered.token == @claude
      assert delivered.host == "api.anthropic.com"
      assert refetch(cred).last_used_at
    end

    test "proxy-billed instances and other users' credentials get nothing" do
      inst = insert(:devbox_instance)
      {:error, _} = AgentCredentials.deliver(inst, :claude_oauth)

      cred = insert(:agent_credential)
      inst = insert(:devbox_instance, agent_billing: launch(:claude, cred))
      {:error, _} = AgentCredentials.deliver(inst, :claude_oauth)
    end

    test "invalid credentials aren't delivered" do
      %{inst: inst, cred: cred} = subscribed(:claude)
      cred |> AgentCredential.usage_changeset(%{status: :invalid}) |> Console.Repo.update!()

      {:error, _} = AgentCredentials.deliver(inst, :claude_oauth)
    end

    test "one instance holds the codex refresh lease, the others never refresh" do
      user = insert(:user)
      cred = insert(:agent_credential, user: user, provider: :codex, kind: :codex_chatgpt_auth, secret: bundle("a"))
      first = insert(:devbox_instance, user: user, agent_billing: launch(:codex, cred))
      second = insert(:devbox_instance, user: user, agent_billing: launch(:codex, cred))

      {:ok, [holder]} = AgentCredentials.deliver(first, :codex)
      {:ok, [other]} = AgentCredentials.deliver(second, :codex)

      assert holder.refresh_lease_holder
      assert holder.bundle_json == bundle("a")
      refute other.refresh_lease_holder
      assert Jason.decode!(other.bundle_json)["last_refresh"]
      assert refetch(cred).lease_holder_id == first.id
    end

    test "an expired lease moves to the next instance that asks" do
      user = insert(:user)
      cred = insert(:agent_credential, user: user, provider: :codex, kind: :codex_chatgpt_auth, secret: bundle("a"))
      first = insert(:devbox_instance, user: user, agent_billing: launch(:codex, cred))
      second = insert(:devbox_instance, user: user, agent_billing: launch(:codex, cred))
      cred
      |> AgentCredential.lease_changeset(%{lease_holder_id: first.id, lease_expires_at: Timex.now() |> Timex.shift(minutes: -1)})
      |> Console.Repo.update!()

      {:ok, [cred2]} = AgentCredentials.deliver(second, :codex)
      assert cred2.refresh_lease_holder
    end
  end

  describe "update/2" do
    setup do
      user = insert(:user)
      cred = insert(:agent_credential, user: user, provider: :codex, kind: :codex_chatgpt_auth, secret: bundle("a"))
      holder = insert(:devbox_instance, user: user, agent_billing: launch(:codex, cred))
      other = insert(:devbox_instance, user: user, agent_billing: launch(:codex, cred))
      {:ok, _} = AgentCredentials.deliver(holder, :codex)
      {:ok, cred: refetch(cred), holder: holder, other: other}
    end

    test "the lease holder's refresh applies and fans out", %{cred: cred, holder: holder, other: other} do
      me = self()
      expect(Control.Test, :push_credential, fn inst, pushed -> send(me, {:pushed, inst.id, pushed}); :ok end)

      {:ok, %{applied: true, current: current}} =
        AgentCredentials.update(holder, %{credential_id: cred.id, expected_version: 1, bundle_json: bundle("b")})

      assert current.version == 2
      assert refetch(cred).secret == bundle("b")
      assert_receive {:pushed, id, %{version: 2, refresh_lease_holder: false}}
      assert id == other.id
    end

    test "a stale version is rejected with the current bundle", %{cred: cred, holder: holder} do
      {:ok, %{applied: true}} = AgentCredentials.update(holder, %{credential_id: cred.id, expected_version: 1, bundle_json: bundle("b")})

      {:ok, %{applied: false, current: current}} =
        AgentCredentials.update(holder, %{credential_id: cred.id, expected_version: 1, bundle_json: bundle("c")})

      assert current.version == 2
      assert current.bundle_json == bundle("b")
      assert refetch(cred).secret == bundle("b")
    end

    test "instances without the lease can't write", %{cred: cred, other: other} do
      {:ok, %{applied: false}} = AgentCredentials.update(other, %{credential_id: cred.id, expected_version: 1, bundle_json: bundle("x")})

      assert refetch(cred).version == 1
    end

    test "instances of other users can't write" do
      cred = insert(:agent_credential, provider: :codex, kind: :codex_chatgpt_auth, secret: bundle("a"))
      inst = insert(:devbox_instance, agent_billing: launch(:codex, cred))

      {:error, _} = AgentCredentials.update(inst, %{credential_id: cred.id, expected_version: 1, bundle_json: bundle("x")})
    end
  end

  describe "auth failures and expiry" do
    test "repeated 401s invalidate the credential and notify the owner" do
      %{inst: inst, cred: cred} = subscribed(:claude)

      for _ <- 1..AgentCredential.max_failures(), do: AgentCredentials.record_auth_failure(inst, :claude)

      assert refetch(cred).status == :invalid
      assert [%AppNotification{priority: :high}] = Console.Repo.all(AppNotification.for_user(cred.user_id))
    end

    test "a success resets the count" do
      %{inst: inst, cred: cred} = subscribed(:claude)
      {:ok, _} = AgentCredentials.record_auth_failure(inst, :claude)
      {:ok, _} = AgentCredentials.record_auth_success(inst, :claude)

      assert refetch(cred).failure_count == 0
    end

    test "owners are warned 30 and 7 days ahead, once each" do
      cred = insert(:agent_credential, expires_at: Timex.now() |> Timex.shift(days: 20))
      soon = insert(:agent_credential, expires_at: Timex.now() |> Timex.shift(days: 5))
      gone = insert(:agent_credential, expires_at: Timex.now() |> Timex.shift(days: -1))

      AgentCredentials.warn_expiring()
      AgentCredentials.warn_expiring()

      assert Map.keys(refetch(cred).warned_at) == ["30d"]
      assert Map.keys(refetch(soon).warned_at) == ["7d"]
      assert refetch(gone).status == :expired
      assert length(Console.Repo.all(AppNotification.for_user(cred.user_id))) == 1
      assert length(Console.Repo.all(AppNotification.for_user(soon.user_id))) == 1
    end
  end

  describe "billing" do
    test "subscription billing needs the workbench policy and a linked credential" do
      user = insert(:user)
      devbox = insert(:devbox)
      closed = insert(:workbench, read_bindings: [%{user_id: user.id}])
      open = insert(:workbench, read_bindings: [%{user_id: user.id}], configuration: %Console.Schema.Workbench.Configuration{devbox: %Console.Schema.Workbench.Configuration.Devbox{allow_subscription_credentials: true}})
      for wb <- [closed, open], do: insert(:workbench_devbox, workbench: wb, devbox: devbox)
      attrs = %{devbox_id: devbox.id, agent_billing: [%{agent: :claude, billing: :subscription}]}

      {:error, "this workbench doesn't allow subscription credentials"} = Devboxes.create_instance(attrs, closed.id, user)
      {:error, "link a claude subscription" <> _} = Devboxes.create_instance(attrs, open.id, user)

      cred = insert(:agent_credential, user: user)
      {:ok, inst} = Devboxes.create_instance(attrs, open.id, user)

      assert %{billing: :subscription, credential_id: id, allow_collaborators: false} = Billing.for_agent(inst, :claude)
      assert id == cred.id
    end

    test "default-billing credentials apply when the workbench allows it" do
      user = insert(:user)
      devbox = insert(:devbox)
      wb = insert(:workbench, read_bindings: [%{user_id: user.id}], configuration: %Console.Schema.Workbench.Configuration{devbox: %Console.Schema.Workbench.Configuration.Devbox{allow_subscription_credentials: true}})
      insert(:workbench_devbox, workbench: wb, devbox: devbox)
      insert(:agent_credential, user: user, default_billing: true)

      {:ok, inst} = Devboxes.create_instance(%{devbox_id: devbox.id}, wb.id, user)
      assert Billing.subscription?(inst, :claude)
    end

    test "collaborators can only prompt a subscription-backed agent when the owner opted in" do
      %{inst: inst} = subscribed(:claude)
      collaborator = insert(:user)

      {:error, "this agent bills to its owner's subscription" <> _} = Billing.check(inst, :claude, collaborator)
      {:ok, _} = Billing.check(inst, :claude, inst.user)

      inst = inst |> Ecto.Changeset.change(agent_billing: put_in(inst.agent_billing, ["claude", "allow_collaborators"], true)) |> Console.Repo.update!()
      {:ok, _} = Billing.check(inst, :claude, collaborator)
    end

    test "subscription-billed agents skip the workbench budget" do
      wb = insert(:workbench, budget: %Workbench.Budget{enabled: true, maximum: 100, min_free: 10, unit: :token, last: 0, last_updated: DateTime.utc_now()})
      %{inst: inst} = subscribed(:claude, workbench: wb)
      proxy = insert(:devbox_instance, workbench: wb)

      {:ok, _} = Billing.check(inst, :claude, inst.user)
      {:error, "workbench budget is exhausted"} = Billing.check(proxy, :claude, proxy.user)
    end

    test "the owner can switch an agent back to the proxy" do
      %{inst: inst} = subscribed(:claude)
      expect(Control.Test, :set_agent_billing, fn _, %{billing: :proxy} -> {:ok, %{}} end)

      {:ok, inst} = Devboxes.set_agent_billing(inst.id, %{agent: :claude, billing: :proxy}, inst.user)
      refute Billing.subscription?(inst, :claude)

      {:error, _} = Devboxes.set_agent_billing(inst.id, %{agent: :claude, billing: :proxy}, insert(:user))
    end
  end

  test "threads gate prompts on billing" do
    %{inst: inst} = subscribed(:claude)
    stranger = insert(:user, roles: %{admin: true})
    thread = insert(:devbox_instance_session, instance: inst, agent: :claude, status: :active, user: inst.user)

    {:error, "this agent bills to its owner's subscription" <> _} = Threads.send_prompt(thread.id, "hi", stranger)
  end

  defp subscribed(agent, opts \\ []) do
    user = insert(:user)
    {provider, kind} = case agent do
      :claude -> {:claude, :claude_oauth_token}
      :codex -> {:codex, :codex_access_token}
    end
    cred = insert(:agent_credential, user: user, provider: provider, kind: kind, secret: @claude)
    wb = opts[:workbench] || insert(:workbench, read_bindings: [%{user_id: user.id}])
    inst = insert(:devbox_instance, user: user, workbench: wb, agent_billing: launch(agent, cred))
    %{inst: inst, cred: cred, user: user}
  end

  defp launch(agent, cred) do
    %{to_string(agent) => %{"billing" => "subscription", "credential_id" => cred.id, "credential_kind" => to_string(cred.kind)}}
  end

  defp bundle(rt), do: Jason.encode!(%{"tokens" => %{"access_token" => "at-#{rt}", "refresh_token" => "rt-#{rt}"}})

  defp jwt(claims) do
    payload = Base.url_encode64(Jason.encode!(claims), padding: false)
    "eyJhbGciOiJub25lIn0.#{payload}.sig"
  end
end
