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

  describe "cloudConnection" do
    test "it can fetch a cloud connection by id" do
      conn = insert(:cloud_connection)

      {:ok, %{data: %{"cloudConnection" => found}}} = run_query("""
        query CloudConn($id: ID!) {
          cloudConnection(id: $id) { id name }
        }
      """, %{"id" => conn.id}, %{current_user: admin_user()})

      assert found["id"] == conn.id
    end

    test "it can respect rbac when fetching a cloud connection by id" do
      user = insert(:user)
      %{group: group} = insert(:group_member, user: user)
      conn = insert(:cloud_connection, read_bindings: [%{group_id: group.id}])

      {:ok, %{data: %{"cloudConnection" => found}}} = run_query("""
        query CloudConn($id: ID!) {
          cloudConnection(id: $id) { id name }
        }
      """, %{"id" => conn.id}, %{current_user: Console.Services.Rbac.preload(user)})

      assert found["id"] == conn.id
    end

    test "non-readers cannot access" do
      conn = insert(:cloud_connection)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query CloudConn($id: ID!) {
          cloudConnection(id: $id) { id name }
        }
      """, %{"id" => conn.id}, %{current_user: insert(:user)})
    end
  end

  describe "serviceContext" do
    test "it can fetch a service context by name" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      ctx = insert(:service_context, project: project)

      {:ok, %{data: %{"serviceContext" => found}}} = run_query("""
        query ServiceContext($name: String!) {
          serviceContext(name: $name) { id name }
        }
      """, %{"name" => ctx.name}, %{current_user: user})

      assert found["id"] == ctx.id
      assert found["name"] == ctx.name
    end

    test "non readers cannot fetch" do
      ctx = insert(:service_context)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query ServiceContext($name: String!) {
          serviceContext(name: $name) { id name }
        }
      """, %{"name" => ctx.name}, %{current_user: insert(:user)})
    end
  end

  describe "cloudConnections" do
    test "it can list cloud connections" do
      conns = insert_list(3, :cloud_connection)

      {:ok, %{data: %{"cloudConnections" => found}}} = run_query("""
        query {
          cloudConnections(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: admin_user()})

      assert from_connection(found)
             |> ids_equal(conns)
    end

    test "it can respect rbac" do
      user = insert(:user)
      %{group: group} = insert(:group_member, user: user)
      conn1 = insert(:cloud_connection, read_bindings: [%{user_id: user.id}])
      conn2 = insert(:cloud_connection, read_bindings: [%{group_id: group.id}])
      insert(:cloud_connection)

      {:ok, %{data: %{"cloudConnections" => found}}} = run_query("""
        query {
          cloudConnections(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: Console.Services.Rbac.preload(user)})

      assert from_connection(found)
             |> ids_equal([conn1, conn2])
    end
  end
end
