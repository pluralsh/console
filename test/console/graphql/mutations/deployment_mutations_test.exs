defmodule Console.GraphQl.DeploymentMutationsTest do
  use Console.DataCase, async: true
  use Mimic

  describe "updateDeploymentSettings" do
    test "admins can update settings" do
      admin = admin_user()
      settings = deployment_settings()
      user = insert(:user)
      git = insert(:git_repository)

      {:ok, %{data: %{"updateDeploymentSettings" => updated}}} = run_query("""
        mutation Update($attrs: DeploymentSettingsAttributes!) {
          updateDeploymentSettings(attributes: $attrs) {
            id
            deployerRepository { id }
            readBindings { user { id } }
          }
        }
      """, %{
        "attrs" => %{
          "deployerRepositoryId" => git.id,
          "readBindings" => [%{"userId" => user.id}]
        }
      }, %{current_user: admin})

      assert updated["id"] == settings.id
      assert updated["deployerRepository"]["id"] == git.id
      assert hd(updated["readBindings"])["user"]["id"] == user.id

      {:ok, %{data: %{"deploymentSettings" => read}}} = run_query("""
        query {
          deploymentSettings {
            readBindings { user { id } }
          }
        }
      """, %{}, %{current_user: admin})

      assert hd(read["readBindings"])["user"]["id"] == user.id
    end
  end

  describe "enableDeployments" do
    test "it will install cd" do
      user = admin_user()
      insert(:deployment_settings)
      %{deploy_token: token} = insert(:cluster, self: true)
      expect(Console.Commands.Plural, :install_cd, fn _, ^token -> {:ok, ""} end)

      {:ok, %{data: %{"enableDeployments" => settings}}} = run_query("""
        mutation {
          enableDeployments { id enabled }
        }
      """, %{}, %{current_user: user})

      assert settings["enabled"]
    end
  end


  describe "updateRbac" do
    test "it can update rbac for a cluster" do
      admin = admin_user()
      user = insert(:user)
      cluster = insert(:cluster)

      {:ok, %{data: %{"updateRbac" => true}}} = run_query("""
        mutation Rbac($id: ID!, $rbac: RbacAttributes!) {
          updateRbac(clusterId: $id, rbac: $rbac)
        }
      """, %{"id" => cluster.id, "rbac" => %{"readBindings" => [%{"userId" => user.id}]}}, %{current_user: admin})
    end
  end

  describe "createAgentMigration" do
    test "admins can create an agent migration" do
      admin = admin_user()

      {:ok, %{data: %{"createAgentMigration" => create}}} = run_query("""
        mutation Create($attrs: AgentMigrationAttributes!) {
          createAgentMigration(attributes: $attrs) {
            ref
          }
        }
      """, %{"attrs" => %{"ref" => "agent-v0.3.30"}}, %{current_user: admin})

      assert create["ref"] == "agent-v0.3.30"
    end
  end

  describe "selfManage" do
    test "it can self-manage a byok console" do
      admin = admin_user()
      deployment_settings(create_bindings: [%{user_id: admin.id}])
      insert(:cluster, self: true)

      {:ok, %{data: %{"selfManage" => svc}}} = run_query("""
        mutation SelfManage($values: String!) {
          selfManage(values: $values) {
            id
            name
          }
        }
      """, %{"values" => "value: bogus"}, %{current_user: admin})

      assert svc["name"] == "console"
    end
  end
end

defmodule Console.GraphQl.Mutations.SyncDeploymentMutationsTest do
  use Console.DataCase, async: false
  use Mimic

  describe "installAddOn" do
    @tag :skip
    test "it can properly install a k8s add-on defined in the scaffolds repo" do
      admin = admin_user()
      cluster = insert(:cluster)
      deployment_settings(artifact_repository: build(:git_repository, url: "https://github.com/pluralsh/scaffolds.git"))

      {:ok, %{data: %{"installAddOn" => svc}}} = run_query("""
        mutation Install($id: ID!) {
          installAddOn(clusterId: $id, configuration: [], name: "metrics-server") {
            id
            name
          }
        }
      """, %{"id" => cluster.id}, %{current_user: admin})

      assert svc["id"]
      assert svc["name"] == "metrics-server"
    end
  end
end
