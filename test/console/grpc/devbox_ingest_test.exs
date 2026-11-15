defmodule Console.GRPC.DevboxIngestTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.GRPC.Devbox.{Auth, Ingest}
  alias Devbox.V1

  defmodule FakeAdapter do
    def get_headers(headers), do: headers
  end

  defp stream(headers), do: %GRPC.Server.Stream{adapter: FakeAdapter, payload: headers}

  defp authed(cluster, overrides \\ %{}) do
    {:ok, token} = Auth.sign("plural-console")
    Map.merge(%{"authorization" => "Bearer #{token}", "devbox-cluster-id" => cluster.id}, overrides)
    |> stream()
  end

  defp kas_token(claims) do
    signer = Joken.Signer.create("HS256", Base.decode64!(Console.conf(:kas_devbox_secret)))
    {:ok, token, _} = Joken.encode_and_sign(claims, signer)
    token
  end

  describe "authentication" do
    test "it rejects calls without a bearer token" do
      cluster = insert(:cluster)
      err = assert_raise GRPC.RPCError, fn ->
        Ingest.heartbeat(%V1.HeartbeatRequest{}, stream(%{"devbox-cluster-id" => cluster.id}))
      end

      assert err.status == GRPC.Status.unauthenticated()
    end

    test "it rejects tokens signed with another secret" do
      cluster = insert(:cluster)
      signer = Joken.Signer.create("HS256", "not-the-secret")
      {:ok, token, _} = Joken.encode_and_sign(%{"exp" => System.system_time(:second) + 60}, signer)

      err = assert_raise GRPC.RPCError, fn ->
        Ingest.heartbeat(%V1.HeartbeatRequest{}, stream(%{"authorization" => "Bearer #{token}", "devbox-cluster-id" => cluster.id}))
      end

      assert err.status == GRPC.Status.unauthenticated()
    end

    test "it rejects expired tokens, tokens without expiry and tokens for kas" do
      cluster = insert(:cluster)
      now = System.system_time(:second)

      for claims <- [%{"exp" => now - 10}, %{"iat" => now}, %{"exp" => now + 60, "aud" => "gitlab-kas"}] do
        headers = %{"authorization" => "Bearer #{kas_token(claims)}", "devbox-cluster-id" => cluster.id}
        assert_raise GRPC.RPCError, fn -> Ingest.heartbeat(%V1.HeartbeatRequest{}, stream(headers)) end
      end
    end

    test "it rejects calls without a known cluster" do
      {:ok, token} = Auth.sign("plural-console")

      for headers <- [%{"authorization" => "Bearer #{token}"}, %{"authorization" => "Bearer #{token}", "devbox-cluster-id" => Ecto.UUID.generate()}] do
        err = assert_raise GRPC.RPCError, fn -> Ingest.heartbeat(%V1.HeartbeatRequest{}, stream(headers)) end
        assert err.status == GRPC.Status.unauthenticated()
      end
    end

    test "control metadata carries a kas-audience token and the cluster" do
      {:ok, %{"authorization" => "Bearer " <> token, "devbox-cluster-id" => "cid"}} = Auth.control_metadata("cid")
      signer = Joken.Signer.create("HS256", Base.decode64!(Console.conf(:kas_devbox_secret)))
      {:ok, claims} = Joken.verify(token, signer)

      assert claims["aud"] == "gitlab-kas"
      assert claims["exp"] > System.system_time(:second)
    end
  end

  describe "heartbeat/2" do
    test "it reports instances console no longer knows about" do
      cluster = insert(:cluster)
      devbox = insert(:devbox, cluster: cluster)
      inst = insert(:devbox_instance, devbox: devbox)
      unknown = Ecto.UUID.generate()

      %V1.HeartbeatResponse{unknown_instance_ids: ids} = Ingest.heartbeat(
        %V1.HeartbeatRequest{instances: [%V1.InstanceHeartbeat{instance_id: inst.id}, %V1.InstanceHeartbeat{instance_id: unknown}]},
        authed(cluster)
      )

      assert ids == [unknown]
    end
  end

  describe "report_instance_status/2" do
    test "it updates an instance of the cluster" do
      cluster = insert(:cluster)
      inst = insert(:devbox_instance, status: :pending, devbox: build(:devbox, cluster: cluster))

      %V1.ReportInstanceStatusResponse{status: status} = Ingest.report_instance_status(
        %V1.ReportInstanceStatusRequest{instance_id: inst.id, status: :INSTANCE_STATUS_RUNNING, generation: 1},
        authed(cluster)
      )

      assert status == :INSTANCE_STATUS_RUNNING
      assert refetch(inst).status == :running
    end

    test "other clusters can't report on it" do
      inst = insert(:devbox_instance, status: :pending)
      other = insert(:cluster)

      err = assert_raise GRPC.RPCError, fn ->
        Ingest.report_instance_status(
          %V1.ReportInstanceStatusRequest{instance_id: inst.id, status: :INSTANCE_STATUS_RUNNING, generation: 1},
          authed(other)
        )
      end

      assert err.status == GRPC.Status.permission_denied()
    end
  end

  describe "get_instance_credentials/2" do
    test "it mints proxy credentials for a live instance" do
      cluster = insert(:cluster)
      inst = insert(:devbox_instance, devbox: build(:devbox, cluster: cluster))

      %V1.GetInstanceCredentialsResponse{credentials: [cred]} = Ingest.get_instance_credentials(
        %V1.GetInstanceCredentialsRequest{instance_id: inst.id, credentials: [%V1.CredentialSelector{kind: :CREDENTIAL_KIND_AI_PROXY}]},
        authed(cluster)
      )

      assert cred.kind == :CREDENTIAL_KIND_AI_PROXY
      assert Console.Devboxes.Credentials.devbox_token?(cred.token)
      assert cred.header_format == "Bearer %s"
    end

    test "it mints oidc tokens for the box's cloud identities" do
      cluster = insert(:cluster)
      devbox = insert(:devbox, cluster: cluster, cloud_identities: [
        %Console.Schema.Devbox.CloudIdentity{name: "aws", provider: :aws, role_arn: "arn:aws:iam::123456789012:role/devbox"}
      ])
      {:ok, _} = Console.WorkloadIdentity.ensure_issuer("devboxes", devbox.id)
      inst = insert(:devbox_instance, devbox: devbox)

      %V1.GetInstanceCredentialsResponse{credentials: [cred]} = Ingest.get_instance_credentials(
        %V1.GetInstanceCredentialsRequest{instance_id: inst.id, credentials: [%V1.CredentialSelector{kind: :CREDENTIAL_KIND_OIDC}]},
        authed(cluster)
      )

      assert cred.kind == :CREDENTIAL_KIND_OIDC
      assert cred.identity == "aws"
      assert [_, _, _] = String.split(cred.token, ".")
      assert Google.Protobuf.to_map(cred.metadata)["role_arn"] == "arn:aws:iam::123456789012:role/devbox"
    end

    test "unknown kinds are unimplemented" do
      cluster = insert(:cluster)
      inst = insert(:devbox_instance, devbox: build(:devbox, cluster: cluster))

      err = assert_raise GRPC.RPCError, fn ->
        Ingest.get_instance_credentials(
          %V1.GetInstanceCredentialsRequest{instance_id: inst.id, credentials: [%V1.CredentialSelector{kind: :CREDENTIAL_KIND_UNSPECIFIED}]},
          authed(cluster)
        )
      end

      assert err.status == GRPC.Status.unimplemented()
    end
  end

  describe "get_instance_credentials/2 for scm" do
    test "it returns the credential of the connection on the selector's host" do
      cluster = insert(:cluster)
      github = insert(:scm_connection, type: :github)
      gitlab = insert(:scm_connection, type: :gitlab, base_url: "https://gitlab.example.com")
      devbox = insert(:devbox, cluster: cluster)
      insert(:devbox_scm_connection, devbox: devbox, connection: github)
      insert(:devbox_scm_connection, devbox: devbox, connection: gitlab)
      inst = insert(:devbox_instance, devbox: devbox)

      %V1.GetInstanceCredentialsResponse{credentials: [cred]} = Ingest.get_instance_credentials(
        %V1.GetInstanceCredentialsRequest{instance_id: inst.id, credentials: [%V1.CredentialSelector{kind: :CREDENTIAL_KIND_SCM, host: "gitlab.example.com"}]},
        authed(cluster)
      )

      assert cred.kind == :CREDENTIAL_KIND_SCM
      assert cred.host == "gitlab.example.com"
      assert cred.header_name == "Authorization"
      assert cred.header_format == "Basic %s"
      assert Base.decode64!(cred.token) == "oauth2:#{gitlab.token}"
      assert Google.Protobuf.to_map(cred.metadata) == %{"scheme" => "basic", "username" => "oauth2"}

      %V1.GetInstanceCredentialsResponse{credentials: creds} = Ingest.get_instance_credentials(
        %V1.GetInstanceCredentialsRequest{instance_id: inst.id, credentials: [%V1.CredentialSelector{kind: :CREDENTIAL_KIND_SCM}]},
        authed(cluster)
      )

      assert Enum.map(creds, & &1.host) |> Enum.sort() == ["github.com", "gitlab.example.com"]
    end
  end

  describe "report_pull_request/2" do
    test "it records egress-observed pull requests against the instance" do
      cluster = insert(:cluster)
      inst = insert(:devbox_instance, devbox: build(:devbox, cluster: cluster))
      url = "https://github.com/pluralsh/console/pull/7"

      %V1.ReportPullRequestResponse{pull_request_id: id, created: true} = Ingest.report_pull_request(
        %V1.ReportPullRequestRequest{instance_id: inst.id, url: url, provider: "github", repository: "github.com/pluralsh/console", number: 7, head_branch: "feat"},
        authed(cluster)
      )

      pr = Console.Repo.get!(Console.Schema.PullRequest, id)
      assert pr.source == :egress
      assert pr.devbox_id == inst.devbox_id
      assert pr.devbox_instance_id == inst.id
      refute pr.devbox_instance_session_id
      assert pr.workbench_id == inst.workbench_id

      %V1.ReportPullRequestResponse{pull_request_id: ^id, created: false} = Ingest.report_pull_request(
        %V1.ReportPullRequestRequest{instance_id: inst.id, url: url},
        authed(cluster)
      )
    end

    test "it rejects instances of other clusters" do
      inst = insert(:devbox_instance)

      assert_raise GRPC.RPCError, fn ->
        Ingest.report_pull_request(%V1.ReportPullRequestRequest{instance_id: inst.id, url: "https://github.com/a/b/pull/1"}, authed(insert(:cluster)))
      end
    end
  end

  describe "devbox_pull_request/2" do
    setup do
      cluster = insert(:cluster)
      insert(:scm_connection, default: true)
      inst = insert(:devbox_instance, devbox: build(:devbox, cluster: cluster))
      thread = insert(:devbox_instance_session, instance: inst)
      {:ok, cluster: cluster, inst: inst, thread: thread}
    end

    defp pr_request(inst, thread_id, extra \\ %{}) do
      struct(V1.DevboxPullRequestRequest, Map.merge(%{
        instance_id: inst.id,
        thread_id: thread_id,
        tool_call_id: "tc-1",
        attributes: %V1.PullRequestAttributes{
          repository: "https://github.com/pluralsh/console.git",
          title: "a pr",
          body: "a body",
          base_branch: "main",
          head_branch: "devbox/branch"
        }
      }, extra))
    end

    test "it attributes the pull request to the X-Devbox-Thread thread", %{cluster: cluster, inst: inst, thread: thread} do
      subagent = insert(:devbox_instance_session, instance: inst, kind: :subagent, parent: thread)
      expect(Console.Deployments.Pr.Dispatcher, :pr, fn _, "a pr", "a body", _, "main", "devbox/branch" ->
        {:ok, %{url: "https://github.com/pluralsh/console/pull/12", title: "a pr"}}
      end)

      %V1.DevboxPullRequestResponse{pull_request_id: id, url: url, number: 12} =
        Ingest.devbox_pull_request(pr_request(inst, subagent.id, %{subagent_session_id: subagent.id}), authed(cluster))

      assert url == "https://github.com/pluralsh/console/pull/12"
      pr = Console.Repo.get!(Console.Schema.PullRequest, id)
      assert pr.source == :mcp
      assert pr.devbox_instance_id == inst.id
      assert pr.devbox_instance_session_id == thread.id
      assert pr.metadata["subagent_session_id"] == subagent.id
    end

    test "it rejects threads of other instances and malformed thread ids", %{cluster: cluster, inst: inst} do
      other = insert(:devbox_instance_session)

      for tid <- [other.id, "not-a-uuid"] do
        err = assert_raise GRPC.RPCError, fn -> Ingest.devbox_pull_request(pr_request(inst, tid), authed(cluster)) end
        assert err.status == GRPC.Status.failed_precondition()
      end
    end
  end

  describe "update_agent_credential/2" do
    test "the lease holder's refresh is applied" do
      cluster = insert(:cluster)
      user = insert(:user)
      cred = insert(:agent_credential, user: user, provider: :codex, kind: :codex_chatgpt_auth, secret: codex_bundle("old"))
      inst = insert(:devbox_instance, user: user, devbox: build(:devbox, cluster: cluster), agent_billing: %{
        "codex" => %{"billing" => "subscription", "credential_id" => cred.id, "credential_kind" => "codex_chatgpt_auth"}
      })
      {:ok, cred} = cred |> Console.Schema.AgentCredential.lease_changeset(%{lease_holder_id: inst.id, lease_expires_at: Timex.now() |> Timex.shift(minutes: 10)}) |> Console.Repo.update()

      %V1.UpdateAgentCredentialResponse{applied: true, current: current} = Ingest.update_agent_credential(
        %V1.UpdateAgentCredentialRequest{instance_id: inst.id, credential_id: cred.id, expected_version: 1, bundle_json: codex_bundle("new")},
        authed(cluster)
      )

      assert current.version == 2
      assert current.refresh_lease_holder
      assert current.codex_mode == :CODEX_CREDENTIAL_MODE_CHATGPT_AUTH
      assert refetch(cred).secret == codex_bundle("new")
    end
  end

  defp codex_bundle(rt), do: Jason.encode!(%{"tokens" => %{"access_token" => "at-#{rt}", "refresh_token" => "rt-#{rt}"}})
end
