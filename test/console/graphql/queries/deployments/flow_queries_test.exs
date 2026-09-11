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

    test "it can roll up flow summaries and filter by service status" do
      user = insert(:user)
      healthy_flow = insert(:flow, name: "healthy-flow", read_bindings: [%{user_id: user.id}])
      failed_flow = insert(:flow, name: "failed-flow", read_bindings: [%{user_id: user.id}])
      healthy_svc = insert(:service, flow: healthy_flow, status: :healthy)
      failed_svc = insert(:service, flow: failed_flow, status: :failed)
      insert(:service, flow: healthy_flow, status: :stale)
      insert(:service_component, service: healthy_svc, state: :running)
      insert(:service_component, service: failed_svc, state: :failed)
      insert(:alert, service: failed_svc)
      pipe = insert(:pipeline, flow: failed_flow)
      edge = insert(:pipeline_edge, pipeline: pipe)
      insert(:pipeline_gate, edge: edge, state: :pending)

      {:ok, %{data: %{"flows" => found, "flowServiceCounts" => counts}}} = run_query("""
        query {
          flows(first: 5) {
            edges {
              node {
                id
                serviceCount
                componentCount
                alertCount
                pipelineCount
                pendingPipelineCount
                serviceStatuses { status count }
                componentStatuses { state count }
              }
            }
          }
          flowServiceCounts { status count }
        }
      """, %{}, %{current_user: user})

      nodes = Map.new(from_connection(found), & {&1["id"], &1})
      healthy = nodes[healthy_flow.id]
      failed = nodes[failed_flow.id]

      assert healthy["serviceCount"] == 2
      assert healthy["componentCount"] == 1
      assert healthy["alertCount"] == 0
      assert failed["serviceCount"] == 1
      assert failed["alertCount"] == 1
      assert failed["pipelineCount"] == 1
      assert failed["pendingPipelineCount"] == 1
      assert Enum.any?(healthy["serviceStatuses"], & &1["status"] == "HEALTHY" && &1["count"] == 1)
      assert Enum.any?(failed["componentStatuses"], & &1["state"] == "FAILED" && &1["count"] == 1)
      assert Enum.any?(counts, & &1["status"] == "FAILED" && &1["count"] == 1)

      {:ok, %{data: %{"flows" => filtered}}} = run_query("""
        query {
          flows(first: 5, statuses: [FAILED]) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(filtered)
             |> ids_equal([failed_flow])
    end

    test "it can sort flows by name, service count, and favorites" do
      user = insert(:user)
      alpha = insert(:flow, name: "alpha-flow", read_bindings: [%{user_id: user.id}])
      zeta = insert(:flow, name: "zeta-flow", read_bindings: [%{user_id: user.id}])
      insert(:service, flow: alpha)
      insert_list(3, :service, flow: zeta)

      {:ok, %{data: %{"flows" => by_name}}} = run_query("""
        query {
          flows(first: 5, sort: NAME, direction: DESC) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(by_name)
             |> Enum.map(& &1["id"]) == [zeta.id, alpha.id]

      {:ok, %{data: %{"flows" => by_count}}} = run_query("""
        query {
          flows(first: 5, sort: SERVICE_COUNT, direction: DESC) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(by_count)
             |> Enum.map(& &1["id"]) == [zeta.id, alpha.id]

      {:ok, %{data: %{"flows" => by_favorite}}} = run_query("""
        query Flows($favoriteIds: [ID]) {
          flows(first: 5, sort: FAVORITED, direction: ASC, favoriteIds: $favoriteIds) {
            edges { node { id } }
          }
        }
      """, %{"favoriteIds" => [alpha.id]}, %{current_user: user})

      assert from_connection(by_favorite)
             |> Enum.map(& &1["id"]) == [alpha.id, zeta.id]
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

    test "it can fetch a flow by name" do
      user = insert(:user)
      flow = insert(:flow, name: "my-flow", read_bindings: [%{user_id: user.id}])

      {:ok, %{data: %{"flow" => found}}} = run_query("""
        query flow($name: String!) {
          flow(name: $name) {
            id
            name
          }
        }
      """, %{"name" => flow.name}, %{current_user: user})

      assert found["id"] == flow.id
      assert found["name"] == flow.name
    end

    test "fetching by name enforces read access" do
      user = insert(:user)
      flow = insert(:flow, name: "other-flow")

      {:ok, %{errors: [_ | _]}} = run_query("""
        query flow($name: String!) {
          flow(name: $name) {
            id
            name
          }
        }
      """, %{"name" => flow.name}, %{current_user: user})
    end

    test "flow requires id or name" do
      user = insert(:user)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query flow {
          flow {
            id
          }
        }
      """, %{}, %{current_user: user})
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

    test "it can fetch issues within a flow" do
      user = insert(:user)
      flow = insert(:flow, read_bindings: [%{user_id: user.id}])
      issues = insert_list(3, :issue, flow: flow)
      insert_list(3, :issue)

      {:ok, %{data: %{"flow" => found}}} = run_query("""
        query flow($id: ID!) {
          flow(id: $id) {
            id
            issues(first: 5) {
              edges { node { id } }
            }
          }
        }
      """, %{"id" => flow.id}, %{current_user: user})

      assert found["id"] == flow.id
      assert from_connection(found["issues"])
             |> ids_equal(issues)
    end

    test "it can filter issues by status within a flow" do
      user = insert(:user)
      flow = insert(:flow, read_bindings: [%{user_id: user.id}])
      open_issues = insert_list(2, :issue, flow: flow, status: :open)
      insert_list(2, :issue, flow: flow, status: :completed)

      {:ok, %{data: %{"flow" => found}}} = run_query("""
        query flow($id: ID!, $status: IssueStatus) {
          flow(id: $id) {
            id
            issues(first: 5, status: $status) {
              edges { node { id status } }
            }
          }
        }
      """, %{"id" => flow.id, "status" => "OPEN"}, %{current_user: user})

      assert found["id"] == flow.id
      assert from_connection(found["issues"])
             |> ids_equal(open_issues)
    end

    test "it can fetch vulnerability reports within a flow" do
      user = insert(:user)
      flow = insert(:flow, read_bindings: [%{user_id: user.id}])
      svc = insert(:service, flow: flow)
      reports = insert_list(3, :vulnerability_report)
      for report <- reports,
        do: insert(:service_vuln, service: svc, report: report)
      insert_list(3, :vulnerability_report)

      {:ok, %{data: %{"flow" => found}}} = run_query("""
        query flow($id: ID!) {
          flow(id: $id) {
            id
            vulnerabilityReports(first: 5) {
              edges { node { id } }
            }
          }
        }
      """, %{"id" => flow.id}, %{current_user: user})

      assert found["id"] == flow.id
      assert from_connection(found["vulnerabilityReports"])
             |> ids_equal(reports)
    end

    test "it can fetch preview environment templates within a flow" do
      user = insert(:user)
      flow = insert(:flow, read_bindings: [%{user_id: user.id}])
      templates = insert_list(3, :preview_environment_template, flow: flow, preview_ttl: 86_400)
      insert_list(3, :preview_environment_template)

      {:ok, %{data: %{"flow" => found}}} = run_query("""
        query flow($id: ID!) {
          flow(id: $id) {
            id
            maxPreviews
            previewEnvironmentTemplates(first: 5) {
              edges { node { id previewTtl } }
            }
          }
        }
      """, %{"id" => flow.id}, %{current_user: user})

      assert found["id"] == flow.id
      assert found["maxPreviews"] == 10
      assert from_connection(found["previewEnvironmentTemplates"])
             |> ids_equal(templates)
      assert Enum.all?(found["previewEnvironmentTemplates"]["edges"], & &1["node"]["previewTtl"] == 86_400)
    end

    test "it can fetch preview environment instances within a flow" do
      user      = insert(:user)
      flow      = insert(:flow, read_bindings: [%{user_id: user.id}])
      template  = insert(:preview_environment_template, flow: flow)
      instances = insert_list(3, :preview_environment_instance, template: template, preview_expires_at: ~U[2026-09-01 00:00:00.000000Z])
      insert_list(3, :preview_environment_instance)

      {:ok, %{data: %{"flow" => found}}} = run_query("""
        query flow($id: ID!) {
          flow(id: $id) {
            id
            previewEnvironmentInstances(first: 5) {
              edges { node { id previewExpiresAt } }
            }
          }
        }
      """, %{"id" => flow.id}, %{current_user: user})

      assert found["id"] == flow.id
      assert from_connection(found["previewEnvironmentInstances"])
             |> ids_equal(instances)
      assert Enum.all?(found["previewEnvironmentInstances"]["edges"], & &1["node"]["previewExpiresAt"])
    end

    test "it can fetch workbenches within a flow" do
      user = insert(:user)
      flow = insert(:flow, read_bindings: [%{user_id: user.id}])
      workbenches = insert_list(3, :workbench)
      for wb <- workbenches, do: insert(:flow_workbench, flow: flow, workbench: wb)
      insert_list(2, :workbench)

      {:ok, %{data: %{"flow" => found}}} = run_query("""
        query flow($id: ID!) {
          flow(id: $id) {
            id
            workbenches { id name }
          }
        }
      """, %{"id" => flow.id}, %{current_user: user})

      assert found["id"] == flow.id
      assert length(found["workbenches"]) == 3
      assert ids_equal(found["workbenches"], workbenches)
    end

    test "it can fetch workbench jobs within a flow" do
      user = insert(:user)
      flow = insert(:flow, read_bindings: [%{user_id: user.id}])
      in_flow_workbench = insert(:workbench)
      out_of_flow_workbench = insert(:workbench)

      insert(:flow_workbench, flow: flow, workbench: in_flow_workbench)
      flow_jobs = insert_list(3, :workbench_job, workbench: in_flow_workbench, flow: flow)
      insert_list(2, :workbench_job, workbench: out_of_flow_workbench)

      {:ok, %{data: %{"flow" => found}}} = run_query("""
        query flow($id: ID!) {
          flow(id: $id) {
            id
            workbenchJobs(first: 5) {
              edges { node { id } }
            }
          }
        }
      """, %{"id" => flow.id}, %{current_user: user})

      assert found["id"] == flow.id
      assert from_connection(found["workbenchJobs"])
             |> ids_equal(flow_jobs)
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
