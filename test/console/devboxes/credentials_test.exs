defmodule Console.Devboxes.CredentialsTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.Devboxes.Credentials
  alias Console.Schema.{ScmConnection, Workbench}

  describe "#verify_ai_proxy/1" do
    test "it accepts valid tokens for live instances" do
      inst = insert(:devbox_instance)
      {:ok, token, _} = Credentials.mint_ai_proxy_token(inst)

      {:ok, verified} = Credentials.verify_ai_proxy(token)
      assert verified.id == inst.id
    end

    test "it rejects revoked, expired, probe and garbage tokens" do
      inst = insert(:devbox_instance)
      {:ok, revoked, _} = Credentials.mint_ai_proxy_token(inst)
      {:ok, probe, _} = Credentials.mint_probe_token(inst.devbox)
      {:ok, _} = Credentials.revoke(inst)

      {:error, _} = Credentials.verify_ai_proxy(revoked)
      {:error, _} = Credentials.verify_ai_proxy(probe)
      {:error, _} = Credentials.verify_ai_proxy("garbage")

      other = insert(:devbox_instance)
      {:ok, expired, _} = devbox_jwt(other, %{"scopes" => ["ai_proxy"]}, ttl: {-1, :minute})
      {:error, _} = Credentials.verify_ai_proxy(expired)
    end

    test "it rejects tokens of ended instances" do
      inst = insert(:devbox_instance, status: :completed)
      {:ok, token, _} = Credentials.mint_ai_proxy_token(inst)

      {:error, "devbox instance has ended"} = Credentials.verify_ai_proxy(token)
    end

    test "it rejects tokens when the workbench budget is exhausted" do
      wb = insert(:workbench, budget: %Workbench.Budget{enabled: true, maximum: 100, min_free: 10, unit: :token, last: 0, last_updated: DateTime.utc_now()})
      inst = insert(:devbox_instance, workbench: wb)
      {:ok, token, _} = Credentials.mint_ai_proxy_token(inst)

      {:error, "workbench budget is exhausted"} = Credentials.verify_ai_proxy(token)
    end
  end

  describe "#mint_probe_token/1" do
    test "it mints a box-scoped jwt that is never a login" do
      devbox = insert(:devbox)
      {:ok, token, exp} = Credentials.mint_probe_token(devbox)

      {:ok, claims} = Console.Guardian.decode_and_verify(token)
      assert claims["typ"] == "devbox"
      assert claims["sub"] == "devbox:#{devbox.id}"
      assert claims["scopes"] == ["probe"]
      assert DateTime.to_unix(exp) == claims["exp"]
      {:error, _} = Console.Guardian.resource_from_token(token)
    end
  end

  describe "#console_token/1" do
    test "it mints a scoped jwt that is only valid while the instance is live, and never as a login" do
      inst = insert(:devbox_instance)
      {:ok, token, exp} = Credentials.console_token(inst)

      {:ok, claims} = Console.Guardian.decode_and_verify(token)
      assert claims["typ"] == "devbox"
      assert claims["sub"] == "devbox_instance:#{inst.id}"
      assert claims["workbench_id"] == inst.workbench_id
      assert claims["scopes"] == ["ai_proxy", "workbench_mcp", "workbench_files"]
      assert DateTime.to_unix(exp) == claims["exp"]
      assert Credentials.devbox_token?(token)

      {:ok, verified} = Credentials.verify(token, "workbench_mcp")
      {:ok, _} = Credentials.verify(token, "workbench_files")
      assert verified.id == inst.id
      assert verified.user.id == inst.user_id
      {:error, _} = Console.Guardian.resource_from_token(token)

      {:ok, _} = Console.Devboxes.end_instance(inst, :cancelled, "test")
      {:error, _} = Credentials.verify(token, "workbench_mcp")
    end

    test "it only verifies the scopes the token carries" do
      inst = insert(:devbox_instance)
      {:ok, token, _} = Credentials.mint_ai_proxy_token(inst)

      {:ok, _} = Credentials.verify(token, "ai_proxy")
      {:error, _} = Credentials.verify(token, "workbench_mcp")
      {:error, _} = Credentials.verify(token, "workbench_files")
    end

    test "it rejects tokens whose workbench doesn't match the instance" do
      inst = insert(:devbox_instance)
      {:ok, token, _} = devbox_jwt(inst, %{"workbench_id" => insert(:workbench).id})

      {:error, _} = Credentials.verify(token, "workbench_mcp")
    end

    test "plain logins aren't devbox tokens, and devbox-typed user tokens aren't logins" do
      inst = insert(:devbox_instance)
      {:ok, login, _} = Console.Guardian.encode_and_sign(inst.user, %{"workbench_id" => inst.workbench_id, "scopes" => ["workbench_mcp"]})
      {:ok, typed, _} = Console.Guardian.encode_and_sign(inst.user, %{"scopes" => ["workbench_mcp"]}, token_type: "devbox")

      refute Credentials.devbox_token?(login)
      {:error, _} = Credentials.verify(login, "workbench_mcp")
      {:error, _} = Credentials.verify(typed, "workbench_mcp")
      {:error, _} = Console.Guardian.resource_from_token(typed)
    end
  end

  describe "#instance_credentials/2" do
    test "it mints scm credentials from the box's connections, filtered by host" do
      conn = insert(:scm_connection, type: :github)
      devbox = insert(:devbox)
      insert(:devbox_scm_connection, devbox: devbox, connection: conn)
      inst = insert(:devbox_instance, devbox: devbox)

      {:ok, [cred]} = Credentials.instance_credentials(inst, [%{kind: :scm, host: "github.com"}])
      assert cred.kind == :scm
      assert cred.host == "github.com"
      assert cred.header_name == "Authorization"
      assert cred.header_format == "Basic %s"
      assert Base.decode64!(cred.token) == "x-access-token:#{conn.token}"
      assert cred.metadata == %{"scheme" => "basic", "username" => "x-access-token"}

      {:ok, []} = Credentials.instance_credentials(inst, [%{kind: :scm, host: "gitlab.com"}])
    end

    test "github app credentials expire when github says, not an hour from when they were served" do
      {:ok, pem, _} = Console.keypair("console@plural.sh")
      inst_id = Ecto.UUID.generate()
      conn = insert(:scm_connection, type: :github, token: nil, github: %{app_id: "123", installation_id: inst_id, private_key: pem})
      devbox = insert(:devbox)
      insert(:devbox_scm_connection, devbox: devbox, connection: conn)
      inst = insert(:devbox_instance, devbox: devbox)
      exp = DateTime.utc_now() |> DateTime.add(20, :minute) |> DateTime.truncate(:second)
      expect(Tentacat.App.Installations, :token, fn _, ^inst_id ->
        {:ok, %{"token" => "app-pat", "expires_at" => DateTime.to_iso8601(exp)}, %HTTPoison.Response{}}
      end)

      {:ok, [cred]} = Credentials.instance_credentials(inst, [%{kind: :scm, host: "github.com"}])
      assert Base.decode64!(cred.token) == "x-access-token:app-pat"
      assert DateTime.compare(cred.expires_at, exp) == :eq
      assert DateTime.compare(cred.refresh_after, DateTime.add(exp, -10, :minute)) == :eq
    end

    test "it picks the connection matching the selector host on boxes with several connections" do
      github = insert(:scm_connection, type: :github)
      gitlab = insert(:scm_connection, type: :gitlab, base_url: "https://GitLab.Example.com/")
      devbox = insert(:devbox)
      insert(:devbox_scm_connection, devbox: devbox, connection: github)
      insert(:devbox_scm_connection, devbox: devbox, connection: gitlab)
      inst = insert(:devbox_instance, devbox: devbox)

      {:ok, [cred]} = Credentials.instance_credentials(inst, [%{kind: :scm, host: "gitlab.example.com"}])
      assert cred.host == "gitlab.example.com"
      assert Base.decode64!(cred.token) == "oauth2:#{gitlab.token}"

      {:ok, [cred]} = Credentials.instance_credentials(inst, [%{kind: :scm, host: "GitHub.com"}])
      assert cred.host == "github.com"
      assert Base.decode64!(cred.token) == "x-access-token:#{github.token}"

      {:ok, creds} = Credentials.instance_credentials(inst, [%{kind: :scm}])
      assert Enum.map(creds, & &1.host) |> Enum.sort() == ["github.com", "gitlab.example.com"]
    end

    test "it formats bitbucket and azure devops credentials for git and the api" do
      cases = [
        {%{type: :bitbucket, username: "bot"}, "Basic %s", "bot:"},
        {%{type: :bitbucket}, "Basic %s", "x-token-auth:"},
        {%{type: :bitbucket_datacenter, base_url: "https://bitbucket.corp.com/scm", username: "svc"}, "Basic %s", "svc:"},
        {%{type: :bitbucket_datacenter, base_url: "https://bitbucket.corp.com"}, "Bearer %s", nil},
        {%{type: :azure_devops, azure: %ScmConnection.Azure{username: "me", organization: "org", project: "proj"}}, "Basic %s", "me:"}
      ]

      for {attrs, format, prefix} <- cases do
        conn = insert(:scm_connection, attrs)
        devbox = insert(:devbox)
        insert(:devbox_scm_connection, devbox: devbox, connection: conn)
        inst = insert(:devbox_instance, devbox: devbox)

        {:ok, [cred]} = Credentials.instance_credentials(inst, [%{kind: :scm}])
        assert cred.header_format == format
        case prefix do
          nil -> assert cred.token == conn.token
          prefix -> assert Base.decode64!(cred.token) == prefix <> conn.token
        end
      end
    end
  end

  describe "#devbox_credentials/2" do
    test "it mints the box's scm credentials, filtered by host" do
      github = insert(:scm_connection, type: :github)
      gitlab = insert(:scm_connection, type: :gitlab, base_url: "https://gitlab.example.com")
      devbox = insert(:devbox)
      insert(:devbox_scm_connection, devbox: devbox, connection: github)
      insert(:devbox_scm_connection, devbox: devbox, connection: gitlab)

      {:ok, [cred]} = Credentials.devbox_credentials(devbox, [%{kind: :scm, host: "github.com"}])
      assert cred.host == "github.com"
      assert Base.decode64!(cred.token) == "x-access-token:#{github.token}"

      {:ok, creds} = Credentials.devbox_credentials(devbox, [%{kind: :scm}])
      assert Enum.map(creds, & &1.host) |> Enum.sort() == ["github.com", "gitlab.example.com"]
    end

    test "it falls back to the default connection" do
      conn = insert(:scm_connection, type: :github, default: true)

      {:ok, [cred]} = Credentials.devbox_credentials(insert(:devbox), [%{kind: :scm}])
      assert Base.decode64!(cred.token) == "x-access-token:#{conn.token}"
    end

    test "every other kind is instance-scoped" do
      devbox = insert(:devbox)

      for kind <- ~w(ai_proxy console oidc claude_oauth codex)a do
        {:error, %{extensions: %{code: "UNSUPPORTED"}}} = Credentials.devbox_credentials(devbox, [%{kind: :scm}, %{kind: kind}])
      end
    end
  end

  describe "#verify_ai_proxy/1 with console tokens" do
    test "it accepts the instance's console token while the instance is live" do
      inst = insert(:devbox_instance)
      {:ok, token, _} = Credentials.console_token(inst)

      {:ok, verified} = Credentials.verify_ai_proxy(token)
      assert verified.id == inst.id

      {:ok, _} = Console.Devboxes.end_instance(inst, :cancelled, "test")
      {:error, _} = Credentials.verify_ai_proxy(token)
    end

    test "it rejects console tokens without an instance claim" do
      user = insert(:user)
      {:ok, token, _} = Console.Guardian.encode_and_sign(user)

      {:error, "invalid devbox token"} = Credentials.verify_ai_proxy(token)
    end

    test "it enforces the workbench budget" do
      wb = insert(:workbench, budget: %Workbench.Budget{enabled: true, maximum: 100, min_free: 10, unit: :token, last: 0, last_updated: DateTime.utc_now()})
      inst = insert(:devbox_instance, workbench: wb)
      {:ok, token, _} = Credentials.console_token(inst)

      {:error, "workbench budget is exhausted"} = Credentials.verify_ai_proxy(token)
    end
  end

  describe "#repository_host/1" do
    test "it parses https and ssh urls" do
      assert Credentials.repository_host("https://github.com/pluralsh/console.git") == "github.com"
      assert Credentials.repository_host("git@github.com:pluralsh/console.git") == "github.com"
    end
  end

  defp devbox_jwt(inst, claims, opts \\ []) do
    %{"workbench_id" => inst.workbench_id, "scopes" => ["ai_proxy", "workbench_mcp", "workbench_files"]}
    |> Map.merge(claims)
    |> then(&Console.Guardian.encode_and_sign(inst, &1, Keyword.put(opts, :token_type, "devbox")))
  end
end
