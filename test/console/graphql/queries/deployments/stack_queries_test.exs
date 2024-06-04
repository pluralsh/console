defmodule Console.GraphQl.Deployments.StackQueriesTest do
  use Console.DataCase, async: true

  describe "infrastructureStack" do
    test "it can fetch a stack by id" do
      stack = insert(:stack)
      runs = insert_list(3, :stack_run, stack: stack)
      insert_list(2, :stack_run)

      {:ok, %{data: %{"infrastructureStack" => found}}} = run_query("""
        query Stack($id: ID!) {
          infrastructureStack(id: $id) {
            id
            name
            runs(first: 5) {
              edges { node { id } }
            }
          }
        }
      """, %{"id" => stack.id}, %{current_user: admin_user()})

      assert found["id"] == stack.id
      assert found["name"] == stack.name

      assert from_connection(found["runs"])
             |> ids_equal(runs)
    end

    test "it can fetch pull requests for a stack" do
      stack = insert(:stack)
      prs = insert_list(3, :pull_request, stack: stack)
      insert_list(2, :pull_request)

      {:ok, %{data: %{"infrastructureStack" => found}}} = run_query("""
        query Stack($id: ID!) {
          infrastructureStack(id: $id) {
            id
            name
            pullRequests(first: 5) {
              edges { node { id } }
            }
          }
        }
      """, %{"id" => stack.id}, %{current_user: admin_user()})

      assert found["id"] == stack.id
      assert from_connection(found["pullRequests"])
             |> ids_equal(prs)
    end
  end

  describe "infrastructureStacks" do
    test "it can list stacks for a user" do
      user = insert(:user)
      %{group: group} = insert(:group_member, user: user)
      stacks  = insert_list(3, :stack, write_bindings: [%{group_id: group.id}])
      other = insert(:stack, read_bindings: [%{user_id: user.id}])
      insert_list(3, :stack)

      {:ok, %{data: %{"infrastructureStacks" => found}}} = run_query("""
        query {
          infrastructureStacks(first: 5) {
            edges {
              node { id }
            }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal([other | stacks])
    end
  end

  describe "clusterStackRuns" do
    test "it can list pending stack runs for a cluster" do
      cluster = insert(:cluster)
      runs = insert_list(3, :stack_run, status: :pending, cluster: cluster)
      insert_list(2, :stack_run, status: :successful, cluster: cluster)
      insert_list(2, :stack_run, status: :pending)

      {:ok, %{data: %{"clusterStackRuns" => found}}} = run_query("""
        query {
          clusterStackRuns(first: 5) {
            edges {
              node {
                id
                jobSpec { namespace serviceAccount }
              }
            }
          }
        }
      """, %{}, %{cluster: cluster})

      assert from_connection(found)
             |> ids_equal(runs)
    end
  end

  describe "stackRun" do
    test "clusters can fetch stack runs" do
      cluster = insert(:cluster)
      run = insert(:stack_run, cluster: cluster)

      {:ok, %{data: %{"stackRun" => found}}} = run_query("""
        query StackRun($id: ID!) {
          stackRun(id: $id) {
            id
            stateUrls {
              terraform { address lock unlock }
            }
          }
        }
      """, %{"id" => run.id}, %{cluster: cluster})

      assert found["id"] == run.id

      assert found["stateUrls"]["terraform"]["address"] =~ "/ext/v1/states/terraform/#{run.stack_id}"
      assert found["stateUrls"]["terraform"]["lock"] =~ "/ext/v1/states/terraform/#{run.stack_id}/lock"
      assert found["stateUrls"]["terraform"]["unlock"] =~ "/ext/v1/states/terraform/#{run.stack_id}/unlock"
    end

    test "clusters can fetch plural creds if actor is present" do
      cluster = insert(:cluster)
      run = insert(:stack_run, cluster: cluster, actor: build(:user))

      {:ok, %{data: %{"stackRun" => found}}} = run_query("""
        query StackRun($id: ID!) {
          stackRun(id: $id) {
            id
            pluralCreds { token url }
          }
        }
      """, %{"id" => run.id}, %{cluster: cluster})

      assert found["id"] == run.id

      assert found["pluralCreds"]["token"]
      assert found["pluralCreds"]["url"]
    end

    test "incorrect clusters cannot fetch plural creds if actor is present" do
      cluster = insert(:cluster)
      run = insert(:stack_run, cluster: cluster, actor: build(:user))

      {:ok, %{errors: [_ | _]}} = run_query("""
        query StackRun($id: ID!) {
          stackRun(id: $id) {
            id
            pluralCreds { token url }
          }
        }
      """, %{"id" => run.id}, %{cluster: insert(:cluster)})
    end

    test "users can fetch stack runs" do
      user = insert(:user)
      stack = insert(:stack, read_bindings: [%{user_id: user.id}])
      run = insert(:stack_run, stack: stack)

      {:ok, %{data: %{"stackRun" => found}}} = run_query("""
        query StackRun($id: ID!) {
          stackRun(id: $id) {
            id
          }
        }
      """, %{"id" => run.id}, %{current_user: user})

      assert found["id"] == run.id
    end
  end
end
