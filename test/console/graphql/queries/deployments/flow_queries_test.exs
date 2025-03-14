defmodule Console.GraphQl.Deployments.FlowQueriesTest do
  use Console.DataCase, async: true

  describe "flows" do
    test "it can list flows for a user" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      flow1 = insert(:flow, read_bindings: [%{user_id: user.id}])
      flow2 = insert(:flow, project: project)
      insert_list(3, :flow)

      {:ok, %{data: %{"flows" => found}}} = run_query("""
        query {
          flows(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal([flow1, flow2])
    end
  end

  describe "flow" do
    test "it can fetch a flow" do
      user = insert(:user)
      flow = insert(:flow, read_bindings: [%{user_id: user.id}])

      {:ok, %{data: %{"flow" => found}}} = run_query("""
        query flow($id: ID!) {
          flow(id: $id) {
            id
          }
        }
      """, %{"id" => flow.id}, %{current_user: user})

      assert found["id"] == flow.id
    end

    test "it can fetch services within a flow" do
      user = insert(:user)
      flow = insert(:flow, read_bindings: [%{user_id: user.id}])
      svcs = insert_list(3, :service, flow: flow)
      insert_list(3, :service)
      {:ok, %{data: %{"flow" => found}}} = run_query("""
        query flow($id: ID!) {
          flow(id: $id) {
            id
            services(first: 3) {
              edges { node { id } }
            }
          }
        }
      """, %{"id" => flow.id}, %{current_user: user})

      assert found["id"] == flow.id
      assert from_connection(found["services"])
             |> ids_equal(svcs)
    end

    test "it can fetch pipelines within a flow" do
      user = insert(:user)
      flow = insert(:flow, read_bindings: [%{user_id: user.id}])
      pipelines = insert_list(3, :pipeline, flow: flow)
      insert_list(3, :pipeline)

      {:ok, %{data: %{"flow" => found}}} = run_query("""
        query flow($id: ID!) {
          flow(id: $id) {
            id
            pipelines(first: 3) {
              edges { node { id } }
            }
          }
        }
      """, %{"id" => flow.id}, %{current_user: user})

      assert found["id"] == flow.id
      assert from_connection(found["pipelines"])
             |> ids_equal(pipelines)
    end

    test "it can fetch prs within a flow" do
      user = insert(:user)
      flow = insert(:flow, read_bindings: [%{user_id: user.id}])
      prs  = insert_list(3, :pull_request, flow: flow)
      insert_list(3, :pull_request)

      {:ok, %{data: %{"flow" => found}}} = run_query("""
        query flow($id: ID!) {
          flow(id: $id) {
            id
            pullRequests(first: 3) {
              edges { node { id } }
            }
          }
        }
      """, %{"id" => flow.id}, %{current_user: user})

      assert found["id"] == flow.id
      assert from_connection(found["pullRequests"])
             |> ids_equal(prs)
    end
  end

  describe "mcpServers" do
    test "it can list servers for a user" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      mcp_server1 = insert(:mcp_server, read_bindings: [%{user_id: user.id}])
      mcp_server2 = insert(:mcp_server, project: project)
      insert_list(3, :mcp_server)

      {:ok, %{data: %{"mcpServers" => found}}} = run_query("""
        query {
          mcpServers(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal([mcp_server1, mcp_server2])
    end
  end

  describe "mcpServer" do
    test "it can fetch a mcpServer" do
      user = insert(:user)
      mcp_server = insert(:mcp_server, read_bindings: [%{user_id: user.id}])

      {:ok, %{data: %{"mcpServer" => found}}} = run_query("""
        query mcpServer($id: ID!) {
          mcpServer(id: $id) {
            id
          }
        }
      """, %{"id" => mcp_server.id}, %{current_user: user})

      assert found["id"] == mcp_server.id
    end
  end
end
