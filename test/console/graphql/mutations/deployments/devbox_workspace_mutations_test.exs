defmodule Console.GraphQl.Deployments.DevboxWorkspaceMutationsTest do
  use Console.DataCase, async: true
  alias Console.Devboxes.StreamToken
  alias Console.Schema.AgentCredential

  @claude "sk-ant-oat01-" <> String.duplicate("s", 48)

  describe "linkAgentCredential" do
    test "it links a subscription and never returns the secret" do
      user = insert(:user)

      {:ok, %{data: %{"linkAgentCredential" => cred}} = resp} = run_query("""
        mutation Link($attrs: AgentCredentialAttributes!) {
          linkAgentCredential(attributes: $attrs) { id provider kind status email version defaultBilling }
        }
      """, %{"attrs" => %{"kind" => "CLAUDE_OAUTH_TOKEN", "secret" => @claude, "defaultBilling" => true}}, %{current_user: user})

      assert cred["provider"] == "CLAUDE"
      assert cred["status"] == "VALID"
      assert cred["email"] == "someone@example.com"
      assert cred["defaultBilling"]
      refute inspect(resp) =~ @claude
      assert Console.Repo.get(AgentCredential, cred["id"]).secret == @claude
    end

    test "the schema has no way to read the secret" do
      cred = insert(:agent_credential)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query { agentCredentials { id secret } }
      """, %{}, %{current_user: cred.user})
    end

    test "vendor rejections surface as errors" do
      {:ok, %{errors: [%{message: msg}]}} = run_query("""
        mutation Link($attrs: AgentCredentialAttributes!) { linkAgentCredential(attributes: $attrs) { id } }
      """, %{"attrs" => %{"kind" => "CLAUDE_OAUTH_TOKEN", "secret" => "sk-ant-oat01-rejected" <> String.duplicate("x", 40)}}, %{current_user: insert(:user)})

      assert msg =~ "rejected"
    end
  end

  describe "agentCredentials" do
    test "users only see their own" do
      cred = insert(:agent_credential)
      insert(:agent_credential)

      {:ok, %{data: %{"agentCredentials" => [found]}}} = run_query("""
        query { agentCredentials { id provider } }
      """, %{}, %{current_user: cred.user})

      assert found["id"] == cred.id
    end
  end

  describe "deleteAgentCredential and setDefaultAgentBilling" do
    test "the owner can manage a credential, others can't" do
      cred = insert(:agent_credential)

      {:ok, %{errors: [_]}} = run_query("""
        mutation Del($id: ID!) { deleteAgentCredential(id: $id) { id } }
      """, %{"id" => cred.id}, %{current_user: insert(:user)})

      {:ok, %{data: %{"setDefaultAgentBilling" => %{"defaultBilling" => true}}}} = run_query("""
        mutation { setDefaultAgentBilling(provider: CLAUDE, enabled: true) { defaultBilling } }
      """, %{}, %{current_user: cred.user})

      {:ok, %{data: %{"deleteAgentCredential" => %{"id" => id}}}} = run_query("""
        mutation Del($id: ID!) { deleteAgentCredential(id: $id) { id } }
      """, %{"id" => cred.id}, %{current_user: cred.user})

      assert id == cred.id
      refute refetch(cred)
    end
  end

  describe "openDevboxStream" do
    test "it returns a websocket url and a verifiable token" do
      user = insert(:user)
      inst = insert(:devbox_instance, user: user, workbench: build(:workbench, read_bindings: [%{user_id: user.id}]))

      {:ok, %{data: %{"openDevboxStream" => stream}}} = run_query("""
        mutation Open($id: ID!) {
          openDevboxStream(instanceId: $id, kind: TERMINAL) { streamId kind url token expiresAt }
        }
      """, %{"id" => inst.id}, %{current_user: inst.user})

      assert stream["kind"] == "TERMINAL"
      assert stream["url"] =~ "/ext/devbox/streams/#{stream["streamId"]}"
      {:ok, %{"instance" => id}} = StreamToken.verify(stream["token"])
      assert id == inst.id
    end
  end

  describe "writeDevboxFile" do
    test "it returns the new sha" do
      user = insert(:user)
      inst = insert(:devbox_instance, user: user, workbench: build(:workbench, read_bindings: [%{user_id: user.id}]))

      {:ok, %{data: %{"writeDevboxFile" => %{"sha256" => sha, "entry" => %{"path" => "a.txt"}}}}} = run_query("""
        mutation Write($id: ID!) {
          writeDevboxFile(instanceId: $id, path: "a.txt", content: "hi") { sha256 entry { path } }
        }
      """, %{"id" => inst.id}, %{current_user: inst.user})

      assert sha == Base.encode16(:crypto.hash(:sha256, "hi"), case: :lower)
    end
  end

  describe "setDevboxAgentBilling" do
    test "the owner can switch to their subscription when the workbench allows it" do
      user = insert(:user)
      wb = insert(:workbench, read_bindings: [%{user_id: user.id}], configuration: %Console.Schema.Workbench.Configuration{devbox: %Console.Schema.Workbench.Configuration.Devbox{allow_subscription_credentials: true}})
      inst = insert(:devbox_instance, user: user, workbench: wb)
      insert(:agent_credential, user: user)

      {:ok, %{data: %{"setDevboxAgentBilling" => %{"agentBilling" => [billing]}}}} = run_query("""
        mutation Bill($id: ID!, $attrs: DevboxAgentBillingAttributes!) {
          setDevboxAgentBilling(instanceId: $id, attributes: $attrs) { agentBilling { agent billing credentialKind allowCollaborators } }
        }
      """, %{"id" => inst.id, "attrs" => %{"agent" => "CLAUDE", "billing" => "SUBSCRIPTION", "allowCollaborators" => true}}, %{current_user: user})

      assert billing == %{"agent" => "CLAUDE", "billing" => "SUBSCRIPTION", "credentialKind" => "claude_oauth_token", "allowCollaborators" => true}
    end
  end
end
