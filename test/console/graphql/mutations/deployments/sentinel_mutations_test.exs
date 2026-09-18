defmodule Console.GraphQl.Deployments.SentinelMutationsTest do
  use Console.DataCase, async: true

  describe "createSentinel" do
    test "it can create a sentinel" do
      {:ok, %{data: %{"createSentinel" => sentinel}}} = run_query("""
        mutation SentinelCreate($attributes: SentinelAttributes!) {
          createSentinel(attributes: $attributes) {
            id
            name
            description
          }
        }
      """, %{"attributes" => %{"name" => "test", "description" => "test"}}, %{current_user: admin_user()})

      assert sentinel["name"] == "test"
      assert sentinel["description"] == "test"
    end
  end

  describe "updateSentinel" do
    test "it can update a sentinel" do
      sentinel = insert(:sentinel)

      {:ok, %{data: %{"updateSentinel" => sentinel}}} = run_query("""
        mutation SentinelUpdate($id: ID!, $attributes: SentinelAttributes!) {
          updateSentinel(id: $id, attributes: $attributes) {
            id
            name
            description
          }
        }
      """, %{
        "id" => sentinel.id,
        "attributes" => %{"name" => "test", "description" => "test"}
      }, %{current_user: admin_user()})

      assert sentinel["name"] == "test"
      assert sentinel["description"] == "test"
    end
  end

  describe "runSentinel" do
    test "project readers can run a sentinel" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      sentinel = insert(:sentinel, project: project, checks: [
        %{type: :log, name: "test", configuration: %{log: %{namespace: "test", duration: "1h", query: "error"}}}
      ])

      {:ok, %{data: %{"runSentinel" => run}}} = run_query("""
        mutation RunSentinel($id: ID!) {
          runSentinel(id: $id) {
            id
            status
            sentinel { id }
          }
        }
      """, %{"id" => sentinel.id}, %{current_user: user})

      assert run["status"] == "PENDING"
      assert run["sentinel"]["id"] == sentinel.id
    end

    test "sentinel.read scoped tokens can run a sentinel" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      sentinel = insert(:sentinel, project: project)
      scoped_user = %{user | scopes: [build(:scope, api: "sentinel.read")]}

      {:ok, %{data: %{"runSentinel" => run}}} = run_query("""
        mutation RunSentinel($id: ID!) {
          runSentinel(id: $id) {
            id
            status
          }
        }
      """, %{"id" => sentinel.id}, %{current_user: scoped_user})

      assert run["status"] == "PENDING"
    end

    test "project readers can run a sentinel by name" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      sentinel = insert(:sentinel, project: project, name: "readable-sentinel")

      {:ok, %{data: %{"runSentinel" => run}}} = run_query("""
        mutation RunSentinel($name: String!) {
          runSentinel(name: $name) {
            id
            status
            sentinel { id }
          }
        }
      """, %{"name" => sentinel.name}, %{current_user: user})

      assert run["status"] == "PENDING"
      assert run["sentinel"]["id"] == sentinel.id
    end

    test "users without sentinel read access cannot run a sentinel" do
      user = insert(:user)
      sentinel = insert(:sentinel)

      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation RunSentinel($id: ID!) {
          runSentinel(id: $id) { id }
        }
      """, %{"id" => sentinel.id}, %{current_user: user})
    end
  end

  describe "deleteSentinel" do
    test "it can delete a sentinel" do
      sentinel = insert(:sentinel)

      {:ok, %{data: %{"deleteSentinel" => found}}} = run_query("""
        mutation SentinelDelete($id: ID!) {
          deleteSentinel(id: $id) {
            id
          }
        }
      """, %{"id" => sentinel.id}, %{current_user: admin_user()})

      assert found["id"] == sentinel.id
      refute refetch(sentinel)
    end
  end

  describe "updateSentinelRunJob" do
    test "it can update a sentinel run job" do
      sentinel_run_job = insert(:sentinel_run_job)

      {:ok, %{data: %{"updateSentinelRunJob" => updated}}} = run_query("""
        mutation SentinelRunJobUpdate($id: ID!, $attributes: SentinelRunJobUpdateAttributes!) {
          updateSentinelRunJob(id: $id, attributes: $attributes) {
            id
            status
          }
        }
      """, %{
        "id" => sentinel_run_job.id,
        "attributes" => %{"status" => "SUCCESS"}
      }, %{cluster: sentinel_run_job.cluster})

      assert updated["id"] == sentinel_run_job.id
      assert updated["status"] == "SUCCESS"
    end
  end
end
