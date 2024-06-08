defmodule Console.GraphQl.Deployments.SettingsQueriesTest do
  use Console.DataCase, async: true
  alias Console.Deployments.Settings

  describe "project" do
    test "it can fetch a project by id" do
      proj = insert(:project)

      {:ok, %{data: %{"project" => found}}} = run_query("""
        query Proj($id: ID!) {
          project(id: $id) { id name }
        }
      """, %{"id" => proj.id}, %{current_user: admin_user()})

      assert found["id"] == proj.id
      assert found["name"] == proj.name
    end

    test "it can fetch a project by name" do
      proj = insert(:project)

      {:ok, %{data: %{"project" => found}}} = run_query("""
        query Proj($name: String!) {
          project(name: $name) { id name }
        }
      """, %{"name" => proj.name}, %{current_user: admin_user()})

      assert found["id"] == proj.id
      assert found["name"] == proj.name
    end
  end

  describe "projects" do
    test "it can list projects" do
      projects = insert_list(3, :project)

      {:ok, %{data: %{"projects" => found}}} = run_query("""
        query {
          projects(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: admin_user()})

      assert from_connection(found)
             |> ids_equal([Settings.default_project!() | projects])
    end

    test "it can respect rbac" do
      user = insert(:user)
      %{group: group} = insert(:group_member, user: user)
      proj1 = insert(:project, read_bindings: [%{user_id: user.id}])
      proj2 = insert(:project, read_bindings: [%{group_id: group.id}])
      insert(:project)

      {:ok, %{data: %{"projects" => found}}} = run_query("""
        query {
          projects(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal([proj1, proj2])
    end
  end
end
