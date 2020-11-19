defmodule Watchman.GraphQl.BuildMutationsTest do
  use Watchman.DataCase, async: true
  use Mimic

  describe "createBuild" do
    test "It can create a new build" do
      user = insert(:user)
      role = insert(:role, permissions: %{deploy: true}, repositories: ["forge"])
      insert(:role_binding, user: user, role: role)
      expect(Watchman.Deployer, :wake, fn -> :ok end)
      expect(Kazan, :run, fn _ -> {:ok, %Kube.Application{metadata: %{name: "forge"}}} end)

      {:ok, %{data: %{"createBuild" => build}}} = run_query("""
        mutation {
          createBuild(attributes: {repository: "forge"}) {
            id
            type
            status
          }
        }
      """, %{}, %{current_user: user})

      assert build["id"]
      assert build["type"] == "DEPLOY"
      assert build["status"] == "QUEUED"
    end
  end

  describe "cancelBuild" do
    test "It can create a new build" do
      build = insert(:build)

      {:ok, %{data: %{"cancelBuild" => cancelled}}} = run_query("""
        mutation Cancel($id: ID!) {
          cancelBuild(id: $id) {
            id
          }
        }
      """, %{"id" => build.id}, %{current_user: insert(:user)})

      assert cancelled["id"] == build.id
    end
  end

  describe "approveBuild" do
    test "It can approve a pending build" do
      build = insert(:build, status: :pending)
      user  = insert(:user)

      {:ok, %{data: %{"approveBuild" => approved}}} = run_query("""
        mutation Approve($id: ID!) {
          approveBuild(id: $id) {
            id
            status
            approver {
              id
            }
          }
        }
      """, %{"id" => build.id}, %{current_user: user})

      assert approved["id"] == build.id
      assert approved["status"] == "RUNNING"
      assert approved["approver"]["id"] == user.id
    end
  end
end