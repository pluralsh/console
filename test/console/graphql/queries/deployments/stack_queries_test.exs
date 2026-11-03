defmodule Console.GraphQl.Deployments.StackQueriesTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.Deployments.{Tar}
  alias Console.Deployments.Git.Discovery
  alias Console.Schema.StackInfracostResource

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

    test "it can paginate stack infracost resources" do
      user = insert(:user)
      stack = insert(:stack, write_bindings: [%{user_id: user.id}])
      run1 = insert(:stack_run, stack: stack)
      run2 = insert(:stack_run, stack: stack)

      Repo.insert!(%StackInfracostResource{
        resource_scope: "breakdown",
        project_name: "default",
        name: "aws_instance.old",
        stack_id: stack.id,
        stack_run_id: run1.id,
        monthly_cost: Decimal.new("7.30")
      })

      newer =
        Repo.insert!(%StackInfracostResource{
          resource_scope: "breakdown",
          project_name: "default",
          name: "aws_instance.foo",
          stack_id: stack.id,
          stack_run_id: run2.id,
          monthly_cost: Decimal.new("8.40")
        })

      {:ok, %{data: %{"infrastructureStack" => found}}} = run_query("""
        query Stack($id: ID!) {
          infrastructureStack(id: $id) {
            infracostResources(first: 1) {
              pageInfo { hasNextPage endCursor }
              edges { node { id resourceScope projectName name monthlyCost } }
            }
          }
        }
      """, %{"id" => stack.id}, %{current_user: user})

      assert found["infracostResources"]["pageInfo"]["hasNextPage"]
      assert [%{"id" => newest_id, "resourceScope" => "breakdown", "name" => "aws_instance.foo"}] =
               from_connection(found["infracostResources"])
      assert newest_id == newer.id

      {:ok, %{data: %{"infrastructureStack" => found}}} = run_query("""
        query Stack($id: ID!, $after: String) {
          infrastructureStack(id: $id) {
            infracostResources(first: 1, after: $after) {
              edges { node { name } }
            }
          }
        }
      """, %{"id" => stack.id, "after" => found["infracostResources"]["pageInfo"]["endCursor"]}, %{current_user: user})

      assert [%{"name" => "aws_instance.old"}] = from_connection(found["infracostResources"])
    end

    test "users without stack read access cannot list stack infracost resources" do
      stack = insert(:stack)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Stack($id: ID!) {
          infrastructureStack(id: $id) {
            infracostResources(first: 10) {
              edges { node { id } }
            }
          }
        }
      """, %{"id" => stack.id}, %{current_user: insert(:user)})
    end

    test "infracost resource pages scale query complexity with their size" do
      stack = insert(:stack)
      page = "infracostResources(first: 100) { edges { node { id name monthlyCost } } }"
      opts = [variables: %{"id" => stack.id}, context: %{current_user: admin_user()}, analyze_complexity: true, max_complexity: 650]

      {:ok, %{data: _} = result} = Absinthe.run("""
        query Stack($id: ID!) { infrastructureStack(id: $id) { #{page} } }
      """, Console.GraphQl, opts)
      refute result[:errors]

      {:ok, %{errors: [%{message: msg} | _]}} = Absinthe.run("""
        query Stack($id: ID!) {
          a: infrastructureStack(id: $id) { #{page} }
          b: infrastructureStack(id: $id) { #{page} }
        }
      """, Console.GraphQl, opts)
      assert msg =~ "too complex"
    end

    test "infracost resources cannot be fetched for a list of runs" do
      stack = insert(:stack)
      run = insert(:stack_run, stack: stack)
      insert(:stack_infracost_resource, stack: stack, stack_run: run)

      {:ok, %{data: %{"infrastructureStack" => found}, errors: [%{message: msg}]}} = run_query("""
        query Stack($id: ID!) {
          infrastructureStack(id: $id) {
            runs(first: 5) {
              edges { node { id infracostResources(first: 5) { edges { node { id } } } } }
            }
          }
        }
      """, %{"id" => stack.id}, %{current_user: admin_user()})

      assert msg =~ "single run"
      assert [%{"id" => id, "infracostResources" => nil}] = from_connection(found["runs"])
      assert id == run.id
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

    test "it can list stacks by status" do
      user = insert(:user)
      %{group: group} = insert(:group_member, user: user)
      failed_stacks = insert_list(2, :stack, status: :failed, write_bindings: [%{group_id: group.id}])
      insert_list(2, :stack, status: :successful, write_bindings: [%{group_id: group.id}])
      insert(:stack, status: :pending, write_bindings: [%{group_id: group.id}])

      {:ok, %{data: %{"infrastructureStacks" => found}}} = run_query("""
        query Stacks($status: StackStatus!) {
          infrastructureStacks(first: 10, status: $status) {
            edges {
              node { id status }
            }
          }
        }
      """, %{"status" => "FAILED"}, %{current_user: user})

      nodes = from_connection(found)
      assert length(nodes) == 2
      assert Enum.all?(nodes, &(&1["status"] == "FAILED"))
      assert ids_equal(nodes, failed_stacks)
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
      run = insert(:stack_run, stack: stack, committer: "alice@example.com")

      {:ok, %{data: %{"stackRun" => found}}} = run_query("""
        query StackRun($id: ID!) {
          stackRun(id: $id) {
            id
            committer
          }
        }
      """, %{"id" => run.id}, %{current_user: user})

      assert found["id"] == run.id
      assert found["committer"] == "alice@example.com"
    end

    test "readers cannot fetch write-protected run fields" do
      user = insert(:user)
      stack = insert(:stack, read_bindings: [%{user_id: user.id}])
      run = insert(:stack_run, stack: stack)
      insert(:stack_file, run: run, stack: stack)
      insert(:stack_infracost_resource, stack_run: run, stack: stack)

      {:ok, %{data: %{"stackRun" => found}, errors: errors}} = run_query("""
        query StackRun($id: ID!) {
          stackRun(id: $id) {
            id
            files { path }
            infracostResources(first: 5) { edges { node { id } } }
          }
        }
      """, %{"id" => run.id}, %{current_user: user})

      assert found["id"] == run.id
      refute found["files"]
      refute found["infracostResources"]
      assert length(errors) == 2
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

    test "it can paginate stack run infracost resources, most expensive first" do
      user = insert(:user)
      stack = insert(:stack, write_bindings: [%{user_id: user.id}])
      run = insert(:stack_run, stack: stack)

      pricey = insert(:stack_infracost_resource, stack: stack, stack_run: run, monthly_cost: Decimal.new("9.20"))
      insert(:stack_infracost_resource, stack: stack, stack_run: run, monthly_cost: Decimal.new("5.10"))
      insert(:stack_infracost_resource, stack: stack, stack_run: run, monthly_cost: nil)
      insert(:stack_infracost_resource, stack: stack, stack_run: run, resource_scope: "diff", monthly_cost: Decimal.new("100"))

      {:ok, %{data: %{"stackRun" => found}}} = run_query("""
        query StackRun($id: ID!) {
          stackRun(id: $id) {
            infracostResources(first: 2, resourceScope: "breakdown") {
              pageInfo { hasNextPage endCursor }
              edges { node { id resourceScope monthlyCost } }
            }
          }
        }
      """, %{"id" => run.id}, %{current_user: user})

      assert found["infracostResources"]["pageInfo"]["hasNextPage"]
      assert [%{"id" => pricey_id, "monthlyCost" => 9.2}, %{"monthlyCost" => 5.1}] =
               from_connection(found["infracostResources"])
      assert pricey_id == pricey.id

      {:ok, %{data: %{"stackRun" => found}}} = run_query("""
        query StackRun($id: ID!, $after: String) {
          stackRun(id: $id) {
            infracostResources(first: 2, after: $after, resourceScope: "breakdown") {
              pageInfo { hasNextPage }
              edges { node { monthlyCost } }
            }
          }
        }
      """, %{"id" => run.id, "after" => found["infracostResources"]["pageInfo"]["endCursor"]}, %{current_user: user})

      assert [%{"monthlyCost" => nil}] = from_connection(found["infracostResources"])
      refute found["infracostResources"]["pageInfo"]["hasNextPage"]
    end

    test "only writers and owning cluster can view stack run infracost resources" do
      user = insert(:user)
      stack = insert(:stack, write_bindings: [%{user_id: user.id}])
      run = insert(:stack_run, stack: stack)

      resource =
        Repo.insert!(%StackInfracostResource{
          resource_scope: "breakdown",
          name: "aws_instance.foo",
          stack_id: stack.id,
          stack_run_id: run.id
        })
      resource_id = resource.id

      {:ok, %{data: %{"stackRun" => found}}} = run_query("""
        query StackRun($id: ID!) {
          stackRun(id: $id) {
            infracostResources(first: 10) {
              edges { node { id } }
            }
          }
        }
      """, %{"id" => run.id}, %{current_user: user})

      assert [%{"id" => ^resource_id}] = from_connection(found["infracostResources"])

      {:ok, %{data: %{"stackRun" => found}}} = run_query("""
        query StackRun($id: ID!) {
          stackRun(id: $id) {
            infracostResources(first: 10) {
              edges { node { id } }
            }
          }
        }
      """, %{"id" => run.id}, %{cluster: run.cluster})

      assert [%{"id" => ^resource_id}] = from_connection(found["infracostResources"])

      {:ok, %{errors: [_ | _]}} = run_query("""
        query StackRun($id: ID!) {
          stackRun(id: $id) {
            infracostResources(first: 10) {
              edges { node { id } }
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

  describe "stackTarball" do
    test "writers can fetch stack files from git tarball" do
      user = insert(:user)
      repo = insert(:git_repository)
      stack = insert(:stack,
        repository: repo,
        git: %{ref: "main", folder: "terraform"},
        write_bindings: [%{user_id: user.id}]
      )

      {:ok, tarball} = Tar.tarball([
        {"main.tf", "resource \"aws_instance\" \"example\" {}"},
        {"variables.tf", "variable \"name\" {}"}
      ])

      expect(Discovery, :fetch, fn ^repo, _ -> {:ok, tarball} end)

      {:ok, %{data: %{"stackTarball" => files}}} = run_query("""
        query StackTarball($id: ID!) {
          stackTarball(id: $id) {
            path
            content
          }
        }
      """, %{"id" => stack.id}, %{current_user: user})

      assert length(files) == 2
      assert Enum.find(files, & &1["path"] == "main.tf")
      assert Enum.find(files, & &1["path"] == "variables.tf")

      main_tf = Enum.find(files, & &1["path"] == "main.tf")
      {:ok, content} = Base.decode64(main_tf["content"])
      assert content == "resource \"aws_instance\" \"example\" {}"
    end

    test "non-writers cannot fetch stack files" do
      repo = insert(:git_repository)
      stack = insert(:stack,
        repository: repo,
        git: %{ref: "main", folder: "terraform"}
      )

      {:ok, %{errors: [_ | _]}} = run_query("""
        query StackTarball($id: ID!) {
          stackTarball(id: $id) {
            path
            content
          }
        }
      """, %{"id" => stack.id}, %{current_user: insert(:user)})
    end
  end

  describe "stackPolicies" do
    test "lists policies associated with a readable stack" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      stack = insert(:stack, project: project)
      policy = insert(:policy, project: project)
      association = insert(:stack_policy, stack: stack, policy: policy)

      {:ok, %{data: %{"infrastructureStack" => %{"stackPolicies" => found}}}} = run_query("""
        query StackPolicies($id: ID!) {
          infrastructureStack(id: $id) {
            stackPolicies(first: 5) {
              edges { node { id type policy { id } } }
            }
          }
        }
      """, %{"id" => stack.id}, %{current_user: user})

      [node] = from_connection(found)
      assert node["id"] == association.id
      assert node["type"] == "APPROVAL"
      assert node["policy"]["id"] == policy.id
    end
  end
end
