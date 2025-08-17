defmodule Console.GraphQl.Deployments.SentinelQueriesTest do
  use Console.DataCase, async: true

  describe "sentinels" do
    test "it can fetch sentinels" do
      sentinels = insert_list(3, :sentinel)

      {:ok, %{data: %{"sentinels" => found}}} = run_query("""
        query {
          sentinels(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: admin_user()})

      assert from_connection(found)
             |> ids_equal(sentinels)
    end

    test "it can search" do
      sentinel = insert(:sentinel, name: "test")
      insert(:sentinel, name: "other")

      {:ok, %{data: %{"sentinels" => found}}} = run_query("""
        query {
          sentinels(first: 5, q: "test") {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: admin_user()})

      assert from_connection(found)
             |> ids_equal([sentinel])
    end

    test "it can respect rbac" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      sentinels = insert_list(2, :sentinel, project: project)
      insert_list(3, :sentinel)

      {:ok, %{data: %{"sentinels" => found}}} = run_query("""
        query {
          sentinels(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal(sentinels)
    end
  end

  describe "sentinel" do
    test "it can fetch a sentinel" do
      sentinel = insert(:sentinel)

      {:ok, %{data: %{"sentinel" => found}}} = run_query("""
        query Sentinel($id: ID!) {
          sentinel(id: $id) {
            id
            name
            description
          }
        }
      """, %{"id" => sentinel.id}, %{current_user: admin_user()})

      assert found["id"] == sentinel.id
      assert found["name"] == sentinel.name
      assert found["description"] == sentinel.description
    end

    test "it can fetch by name" do
      sentinel = insert(:sentinel)

      {:ok, %{data: %{"sentinel" => found}}} = run_query("""
        query Sentinel($name: String!) {
          sentinel(name: $name) {
            id
            name
            description
          }
        }
      """, %{"name" => sentinel.name}, %{current_user: admin_user()})

      assert found["id"] == sentinel.id
      assert found["name"] == sentinel.name
      assert found["description"] == sentinel.description
    end
  end
end
