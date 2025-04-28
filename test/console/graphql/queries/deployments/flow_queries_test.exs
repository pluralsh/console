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

    test "it can fetch preview environment templates within a flow" do
      user = insert(:user)
      flow = insert(:flow, read_bindings: [%{user_id: user.id}])
      templates = insert_list(3, :preview_environment_template, flow: flow)
      insert_list(3, :preview_environment_template)

      {:ok, %{data: %{"flow" => found}}} = run_query("""
        query flow($id: ID!) {
          flow(id: $id) {
            id
            previewEnvironmentTemplates(first: 5) {
              edges { node { id } }
            }
          }
        }
      """, %{"id" => flow.id}, %{current_user: user})

      assert found["id"] == flow.id
      assert from_connection(found["previewEnvironmentTemplates"])
             |> ids_equal(templates)
    end

    test "it can fetch preview environment instances within a flow" do
      user      = insert(:user)
      flow      = insert(:flow, read_bindings: [%{user_id: user.id}])
      template  = insert(:preview_environment_template, flow: flow)
      instances = insert_list(3, :preview_environment_instance, template: template)
      insert_list(3, :preview_environment_instance)

      {:ok, %{data: %{"flow" => found}}} = run_query("""
        query flow($id: ID!) {
          flow(id: $id) {
            id
            previewEnvironmentInstances(first: 5) {
              edges { node { id } }
            }
          }
        }
      """, %{"id" => flow.id}, %{current_user: user})

      assert found["id"] == flow.id
      assert from_connection(found["previewEnvironmentInstances"])
             |> ids_equal(instances)
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

  describe "previewEnvironmentTemplate" do
    test "it can fetch a preview environment template by id" do
      user = insert(:user)
      flow = insert(:flow, read_bindings: [%{user_id: user.id}])
      template = insert(:preview_environment_template, flow: flow)

      {:ok, %{data: %{"previewEnvironmentTemplate" => found}}} = run_query("""
        query previewEnvironmentTemplate($id: ID!) {
          previewEnvironmentTemplate(id: $id) {
            id
            name
          }
        }
      """, %{"id" => template.id}, %{current_user: user})

      assert found["id"] == template.id
      assert found["name"] == template.name
    end

    test "it can fetch a preview environment template by flow id and name" do
      user = insert(:user)
      flow = insert(:flow, read_bindings: [%{user_id: user.id}])
      template = insert(:preview_environment_template, flow: flow)

      {:ok, %{data: %{"previewEnvironmentTemplate" => found}}} = run_query("""
        query previewEnvironmentTemplate($flowId: ID!, $name: String!) {
          previewEnvironmentTemplate(flowId: $flowId, name: $name) {
            id
            name
          }
        }
      """, %{"flowId" => flow.id, "name" => template.name}, %{current_user: user})

      assert found["id"] == template.id
      assert found["name"] == template.name
    end

    test "non-readers cannot fetch preview environment templates" do
      user = insert(:user)
      flow = insert(:flow)
      template = insert(:preview_environment_template, flow: flow)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query previewEnvironmentTemplate($id: ID!) {
          previewEnvironmentTemplate(id: $id) {
            id
            name
          }
        }
      """, %{"id" => template.id}, %{current_user: user})
    end
  end
end
