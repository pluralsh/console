defmodule Console.GraphQl.DeploymentQueriesTest do
  use Console.DataCase, async: true

  describe "globalService" do
    test "a reader can fetch global services and subservices" do
      user = admin_user()
      global = insert(:global_service)
      svcs = insert_list(3, :service, owner: global)

      {:ok, %{data: %{"globalService" => svc}}} = run_query("""
        query Global($id: ID!) {
          globalService(id: $id) {
            id
            services(first: 5) {
              edges { node { id } }
            }
          }
        }
      """, %{"id" => global.id}, %{current_user: user})

      assert svc["id"] == global.id
      assert from_connection(svc["services"])
             |> ids_equal(svcs)
    end
  end

  describe "deploymentSettings" do
    test "users can fetch settings" do
      admin = insert(:user)
      settings = deployment_settings()

      {:ok, %{data: %{"deploymentSettings" => updated}}} = run_query("""
        query {
          deploymentSettings {
            id
            deployerRepository { id }
          }
        }
      """, %{}, %{current_user: admin})

      assert updated["id"] == settings.id
      assert updated["deployerRepository"]["id"] == settings.deployer_repository_id
    end
  end
end

defmodule Console.GraphQl.Mutations.SyncDeploymentQueriesTest do
  use Console.DataCase, async: false
  use Mimic

  describe "gitRepository" do
    test "it can fetch the refs from a git repository" do
      admin = admin_user()
      git = insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")

      {:ok, %{data: %{"gitRepository" => %{"refs" => refs}}}} = run_query("""
        query Git($id: ID!) {
          gitRepository(id: $id) {
            refs
          }
        }
      """, %{"id" => git.id}, %{current_user: admin})

      assert Enum.member?(refs, "refs/heads/main")
    end
  end
end
