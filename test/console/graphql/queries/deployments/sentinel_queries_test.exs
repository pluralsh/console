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

    test "it can fetch a sentinels runs" do
      sentinel = insert(:sentinel)
      runs = insert_list(3, :sentinel_run, sentinel: sentinel)
      insert_list(3, :sentinel_run)

      {:ok, %{data: %{"sentinel" => found}}} = run_query("""
        query Sentinel($id: ID!) {
          sentinel(id: $id) {
            id
            name
            runs(first: 5) {
              edges { node { id } }
            }
          }
        }
      """, %{"id" => sentinel.id}, %{current_user: admin_user()})

      assert from_connection(found["runs"])
             |> ids_equal(runs)
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

  describe "sentinelStatistics" do
    test "it can fetch sentinel statistics" do
      insert(:sentinel, status: :success)
      insert_list(2, :sentinel, status: :failed)
      insert_list(3, :sentinel, status: :pending)

      {:ok, %{data: %{"sentinelStatistics" => found}}} = run_query("""
        query {
          sentinelStatistics {
            status
            count
          }
        }
      """, %{}, %{current_user: admin_user()})

      by_status = Map.new(found, &{&1["status"], &1["count"]})
      assert by_status["SUCCESS"] == 1
      assert by_status["FAILED"] == 2
      assert by_status["PENDING"] == 3
    end
  end
end
