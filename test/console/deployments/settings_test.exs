defmodule Console.Deployments.SettingsTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.PubSub
  alias Console.Deployments.Settings

  describe "#enable/1" do
    test "it will call the install command" do
      user = admin_user()
      insert(:deployment_settings)
      %{deploy_token: token} = insert(:cluster, self: true)
      expect(Console.Commands.Plural, :install_cd, fn _, ^token -> {:ok, ""} end)

      {:ok, updated} = Settings.enable(user)

      assert updated.enabled
    end
  end

  describe "#update/2" do
    test "admins can update global settings" do
      admin = admin_user()
      user = insert(:user)
      insert(:deployment_settings)

      {:ok, updated} = Settings.update(%{write_bindings: [%{user_id: user.id}]}, admin)

      %{write_bindings: [binding]} = Repo.preload(updated, [:write_bindings])
      assert binding.user_id == user.id
    end

    test "it cannot write escalate" do
      user = insert(:user)
      insert(:deployment_settings)

      {:error, _} = Settings.update(%{write_bindings: [%{user_id: user.id}]}, user)
    end

    test "it can create a migration if helm values were modified" do
      admin = admin_user()
      insert(:deployment_settings)

      {:ok, updated} = Settings.update(%{agent_helm_values: "bogus: values"}, admin)

      assert updated.agent_helm_values == "bogus: values"
      [%{id: id} = migration] = Console.Repo.all(Console.Schema.AgentMigration)
      assert migration.helm_values == "bogus: values"

      assert_receive {:event, %PubSub.DeploymentSettingsUpdated{item: ^updated}}
      assert_receive {:event, %PubSub.AgentMigrationCreated{item: %{id: ^id}}}
    end

    test "non admins cannot update" do
      user = insert(:user)
      insert(:deployment_settings)

      {:error, _} = Settings.update(%{write_bindings: [%{user_id: user.id}]}, insert(:user))
    end
  end

  describe "#migrate_agents/0" do
    test "it will set agent deployment settings globally" do
      insert(:user, bot_name: "console", roles: %{admin: true})
      insert(:deployment_settings)

      {:ok, update} = Settings.migrate_agents()

      assert update.agent_version

      [migration] = Console.Repo.all(Console.Schema.AgentMigration)
      assert migration.ref == update.agent_version
    end

    test "if the agent has already been migrated, it won't go again" do
      insert(:user, bot_name: "console", roles: %{admin: true})
      insert(:deployment_settings, agent_version: Settings.agent_ref())

      {:ok, _} = Settings.migrate_agents()

      [] = Console.Repo.all(Console.Schema.AgentMigration)
    end

    test "it will ignore if managing agents is not set" do
      insert(:user, bot_name: "console", roles: %{admin: true})
      insert(:deployment_settings, manage_agents: false)

      {:error, _} = Settings.migrate_agents()
    end
  end

  describe "#create_project/2" do
    test "admins can create a new project" do
      {:ok, proj} = Settings.create_project(%{name: "test"}, admin_user())

      assert proj.name == "test"
    end

    test "nonadmins cannot create projects" do
      user = insert(:user)
      {:error, _} = Settings.create_project(%{
        name: "test",
        write_bindings: [%{user_id: user.id}]
      }, user)
    end
  end

  describe "#update_project/3" do
    test "admins can update a new project" do
      proj = insert(:project)
      {:ok, updated} = Settings.update_project(%{
        name: "test",
        write_bindings: [%{user_id: insert(:user).id}]
      }, proj.id, admin_user())

      assert updated.id == proj.id
      assert updated.name == "test"
    end

    test "nonadmins cannot update projects" do
      proj = insert(:project)
      user = insert(:user)
      {:error, _} = Settings.update_project(%{
        name: "test",
        write_bindings: [%{user_id: user.id}]
      }, proj.id, user)
    end
  end

  describe "#delete_project/2" do
    test "admins can delete a new project" do
      proj = insert(:project)
      {:ok, deleted} = Settings.delete_project(proj.id, admin_user())

      assert deleted.id == proj.id
      assert deleted.name == proj.name
    end

    test "you cannot delete a nonempty project" do
      proj = insert(:project)
      insert(:cluster, project: proj)
      {:error, _} = Settings.delete_project(proj.id, admin_user())
    end

    test "nonadmins cannot delete projects" do
      proj = insert(:project)
      {:error, _} = Settings.delete_project(proj.id, insert(:user))
    end
  end

  describe "#upsert_cloud_connection/2" do
    test "admins can create a cloud connection" do
      {:ok, updated} = Settings.upsert_cloud_connection(%{
        provider: :aws,
        name: "test",
        configuration: %{
          aws: %{
            access_key_id: "access-key-id",
            secret_access_key: "secret-access-key",
            region: "us-east-1"
          }
        }
      }, admin_user())

      assert updated.name == "test"
      assert updated.provider == :aws
      assert updated.configuration.aws.access_key_id == "access-key-id"
      assert updated.configuration.aws.secret_access_key == "secret-access-key"
      assert updated.configuration.aws.region == "us-east-1"
    end

    test "admins can update a cloud connection" do
      conn = insert(:cloud_connection)

      {:ok, updated} = Settings.upsert_cloud_connection(%{
        name: conn.name,
        configuration: %{
          aws: %{
            access_key_id: "access-key-id",
            secret_access_key: "new-secret-access-key",
            region: "us-east-1"
          }
        }
      }, admin_user())

      assert updated.id == conn.id
      assert updated.name == conn.name
      assert updated.provider == :aws
      assert updated.configuration.aws.access_key_id == "access-key-id"
      assert updated.configuration.aws.secret_access_key == "new-secret-access-key"
      assert updated.configuration.aws.region == "us-east-1"
    end

    test "nonadmins cannot upsert cloud connections" do
      conn = insert(:cloud_connection)

      {:error, _} = Settings.upsert_cloud_connection(%{
        id: conn.id,
        name: "test",
        configuration: %{
          aws: %{
            access_key_id: "access-key-id",
            secret_access_key: "new-secret-access-key",
            region: "us-east-1"
          }
        }
      }, insert(:user))
    end
  end

  describe "#delete_cloud_connection/2" do
    test "admins can delete a cloud connection" do
      conn = insert(:cloud_connection)

      {:ok, deleted} = Settings.delete_cloud_connection(conn.id, admin_user())

      assert deleted.id == conn.id
      assert deleted.name == conn.name

      refute refetch(deleted)
    end

    test "nonadmins cannot delete cloud connections" do
      conn = insert(:cloud_connection)

      {:error, _} = Settings.delete_cloud_connection(conn.id, insert(:user))
    end
  end

  describe "#create_federated_credential/2" do
    test "admins can create a federated credential" do
      user = insert(:user)
      {:ok, updated} = Settings.create_federated_credential(%{
        issuer: "https://oidc.plural.sh",
        claims_like: %{"sub" => ".*@example.com"},
        scopes: ["createPullRequest"],
        user_id: user.id
      }, admin_user())

      assert updated.issuer == "https://oidc.plural.sh"
      assert updated.claims_like == %{"sub" => ".*@example.com"}
      assert updated.scopes == ["createPullRequest"]
      assert updated.user_id == user.id
    end

    test "nonadmins cannot create federated credentials" do
      {:error, _} = Settings.create_federated_credential(%{
        issuer: "https://oidc.plural.sh",
        claims_like: %{"sub" => ".*@example.com"},
        scopes: ["createPullRequest"]
      }, insert(:user))
    end
  end

  describe "#update_federated_credential/3" do
    test "admins can update a federated credential" do
      credential = insert(:federated_credential)
      {:ok, updated} = Settings.update_federated_credential(%{
        claims_like: %{"sub" => ".*@plural.sh"},
        scopes: ["createPullRequest"]
      }, credential.id, admin_user())

      assert updated.id == credential.id
      assert updated.claims_like == %{"sub" => ".*@plural.sh"}
    end

    test "nonadmins cannot create federated credentials" do
      {:error, _} = Settings.create_federated_credential(%{
        issuer: "https://oidc.plural.sh",
        claims_like: %{"sub" => ".*@example.com"},
        scopes: ["createPullRequest"]
      }, insert(:user))
    end
  end

  describe "#delete_federated_credential/2" do
    test "admins can delete a federated credential" do
      credential = insert(:federated_credential)
      {:ok, _} = Settings.delete_federated_credential(credential.id, admin_user())
    end

    test "nonadmins cannot delete federated credentials" do
      credential = insert(:federated_credential)
      {:error, _} = Settings.delete_federated_credential(credential.id, insert(:user))
    end
  end
end
