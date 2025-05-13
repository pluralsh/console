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

    test "it can fetch a stack by name" do
      stack = insert(:stack)
      runs = insert_list(3, :stack_run, stack: stack)
      insert_list(2, :stack_run)

      {:ok, %{data: %{"infrastructureStack" => found}}} = run_query("""
        query Stack($name: String!) {
          infrastructureStack(name: $name) {
            id
            name
            runs(first: 5) {
              edges { node { id } }
            }
          }
        }
      """, %{"name" => stack.name}, %{current_user: admin_user()})

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

    test "only writers can view variables" do
      user = insert(:user)
      stack = insert(:stack, write_bindings: [%{user_id: user.id}], variables: %{"foo" => "bar"})

      {:ok, %{data: %{"infrastructureStack" => found}}} = run_query("""
        query Stack($id: ID!) {
          infrastructureStack(id: $id) {
            variables
          }
        }
      """, %{"id" => stack.id}, %{current_user: user})

      assert found["variables"] == %{"foo" => "bar"}

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Stack($id: ID!) {
          infrastructureStack(id: $id) {
            variables
          }
        }
      """, %{"id" => stack.id}, %{current_user: insert(:user)})
    end

    test  "only writers can view state" do
      user = insert(:user)
      stack = insert(:stack, write_bindings: [%{user_id: user.id}], variables: %{"foo" => "bar"})
      state = insert(:stack_state, stack: stack)

      {:ok, %{data: %{"infrastructureStack" => found}}} = run_query("""
        query Stack($id: ID!) {
          infrastructureStack(id: $id) {
            state {
              id
            }
          }
        }
      """, %{"id" => stack.id}, %{current_user: user})

      assert found["state"]["id"] == state.id

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Stack($id: ID!) {
          infrastructureStack(id: $id) {
            state {
              id
            }
          }
        }
      """, %{"id" => stack.id}, %{current_user: insert(:user)})
    end

    test "only writers can view files" do
      user = insert(:user)
      stack = insert(:stack, write_bindings: [%{user_id: user.id}], variables: %{"foo" => "bar"})
      file = insert(:stack_file, stack: stack)

      {:ok, %{data: %{"infrastructureStack" => found}}} = run_query("""
        query Stack($id: ID!) {
          infrastructureStack(id: $id) {
            files {
              path
              content
            }
          }
        }
      """, %{"id" => stack.id}, %{current_user: user})

      assert hd(found["files"])["path"] == file.path
      assert hd(found["files"])["content"] == file.content

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Stack($id: ID!) {
          infrastructureStack(id: $id) {
            files {
              path
              content
            }
          }
        }
      """, %{"id" => stack.id}, %{current_user: insert(:user)})
    end

    test "only writers can view secret environment variables" do
      user = insert(:user)
      stack = insert(:stack, write_bindings: [%{user_id: user.id}], variables: %{"foo" => "bar"})
      insert(:stack_environment, stack: stack, secret: true)

      {:ok, %{data: %{"infrastructureStack" => found}}} = run_query("""
        query Stack($id: ID!) {
          infrastructureStack(id: $id) {
            environment {
              name
              value
              secret
            }
          }
        }
      """, %{"id" => stack.id}, %{current_user: user})

      assert hd(found["environment"])["name"] == "foo"
      assert hd(found["environment"])["value"] == "bar"
      assert hd(found["environment"])["secret"] == true

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Stack($id: ID!) {
          infrastructureStack(id: $id) {
            environment {
              name
              value
              secret
            }
          }
        }
      """, %{"id" => stack.id}, %{current_user: insert(:user)})
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

    test "it can list stacks by a tag" do
      user = insert(:user)
      %{group: group} = insert(:group_member, user: user)
      stacks  = insert_list(3, :stack, write_bindings: [%{group_id: group.id}], tags: [%{name: "t", value: "v"}])
      insert(:stack, read_bindings: [%{user_id: user.id}])
      insert_list(3, :stack)

      {:ok, %{data: %{"infrastructureStacks" => found}}} = run_query("""
        query Stacks($tq: TagQuery!) {
          infrastructureStacks(first: 5, tagQuery: $tq) {
            edges {
              node { id }
            }
          }
        }
      """, %{"tq" => %{"op" => "AND", "tags" => [
        %{"name" => "t", "value" => "v"}
      ]}}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal(stacks)
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

    test "only writers can view variables" do
      user = insert(:user)
      stack = insert(:stack, write_bindings: [%{user_id: user.id}], variables: %{"foo" => "bar"})
      run = insert(:stack_run, stack: stack, variables: %{"foo" => "bar"})

      {:ok, %{data: %{"stackRun" => found}}} = run_query("""
        query stackRun($id: ID!) {
          stackRun(id: $id) {
            variables
          }
        }
      """, %{"id" => run.id}, %{current_user: user})

      assert found["variables"] == %{"foo" => "bar"}

      {:ok, %{data: %{"stackRun" => found}}} = run_query("""
        query stackRun($id: ID!) {
          stackRun(id: $id) {
            variables
          }
        }
      """, %{"id" => run.id}, %{cluster: run.cluster})

      assert found["variables"] == %{"foo" => "bar"}

      {:ok, %{errors: [_ | _]}} = run_query("""
        query StackRun($id: ID!) {
          stackRun(id: $id) {
            variables
          }
        }
      """, %{"id" => stack.id}, %{current_user: insert(:user)})
    end

    test  "only writers can view state" do
      user = insert(:user)
      stack = insert(:stack, write_bindings: [%{user_id: user.id}], variables: %{"foo" => "bar"})
      run = insert(:stack_run, stack: stack)
      state = insert(:stack_state, run: run)

      {:ok, %{data: %{"stackRun" => found}}} = run_query("""
        query StackRun($id: ID!) {
          stackRun(id: $id) {
            state {
              id
            }
          }
        }
      """, %{"id" => run.id}, %{current_user: user})

      assert found["state"]["id"] == state.id

      {:ok, %{data: %{"stackRun" => found}}} = run_query("""
        query StackRun($id: ID!) {
          stackRun(id: $id) {
            state {
              id
            }
          }
        }
      """, %{"id" => run.id}, %{cluster: run.cluster})

      assert found["state"]["id"] == state.id

      {:ok, %{errors: [_ | _]}} = run_query("""
        query StackRun($id: ID!) {
          stackRun(id: $id) {
            state {
              id
            }
          }
        }
      """, %{"id" => run.id}, %{current_user: insert(:user)})
    end

    test "only writers can view files" do
      user = insert(:user)
      stack = insert(:stack, write_bindings: [%{user_id: user.id}], variables: %{"foo" => "bar"})
      run = insert(:stack_run, stack: stack)
      file = insert(:stack_file, run: run)

      {:ok, %{data: %{"stackRun" => found}}} = run_query("""
        query StackRun($id: ID!) {
          stackRun(id: $id) {
            files {
              path
              content
            }
          }
        }
      """, %{"id" => run.id}, %{current_user: user})

      assert hd(found["files"])["path"] == file.path
      assert hd(found["files"])["content"] == file.content

      {:ok, %{data: %{"stackRun" => found}}} = run_query("""
        query StackRun($id: ID!) {
          stackRun(id: $id) {
            files {
              path
              content
            }
          }
        }
      """, %{"id" => run.id}, %{cluster: run.cluster})

      assert hd(found["files"])["path"] == file.path
      assert hd(found["files"])["content"] == file.content

      {:ok, %{errors: [_ | _]}} = run_query("""
        query StackRun($id: ID!) {
          stackRun(id: $id) {
            files {
              path
              content
            }
          }
        }
      """, %{"id" => run.id}, %{current_user: insert(:user)})
    end

    test "only writers can view secret environment variables" do
      user = insert(:user)
      stack = insert(:stack, write_bindings: [%{user_id: user.id}], variables: %{"foo" => "bar"})
      run = insert(:stack_run, stack: stack)
      env = insert(:stack_environment, run: run, secret: true)

      {:ok, %{data: %{"stackRun" => found}}} = run_query("""
        query StackRun($id: ID!) {
          stackRun(id: $id) {
            environment {
              name
              value
              secret
            }
          }
        }
      """, %{"id" => run.id}, %{current_user: user})

      assert hd(found["environment"])["name"] == env.name
      assert hd(found["environment"])["value"] == env.value
      assert hd(found["environment"])["secret"] == true

      {:ok, %{data: %{"stackRun" => found}}} = run_query("""
        query StackRun($id: ID!) {
          stackRun(id: $id) {
            environment {
              name
              value
              secret
            }
          }
        }
      """, %{"id" => run.id}, %{cluster: run.cluster})

      assert hd(found["environment"])["name"] == env.name
      assert hd(found["environment"])["value"] == env.value
      assert hd(found["environment"])["secret"] == true

      {:ok, %{errors: [_ | _]}} = run_query("""
        query StackRun($id: ID!) {
          stackRun(id: $id) {
            environment {
              name
              value
              secret
            }
          }
        }
      """, %{"id" => run.id}, %{current_user: insert(:user)})
    end
  end

  describe "stackDefinitions" do
    test "it can list stack definitions" do
      defs = insert_list(3, :stack_definition)

      {:ok, %{data: %{"stackDefinitions" => found}}} = run_query("""
        query {
          stackDefinitions(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: insert(:user)})

      assert from_connection(found)
             |> ids_equal(defs)
    end
  end
end
