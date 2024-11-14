defmodule Console.GraphQl.Deployments.PipelineQueriesTest do
  use Console.DataCase, async: true

  describe "pipelines" do
    test "it will list pipelines w/ rbac in mind" do
      user = insert(:user)
      %{group: group} = insert(:group_member, user: user)
      pipes = insert_list(3, :pipeline, read_bindings: [%{group_id: group.id}])
      other = insert(:pipeline, write_bindings: [%{user_id: user.id}])
      insert_list(3, :pipeline)

      {:ok, %{data: %{"pipelines" => found}}} = run_query("""
        query {
          pipelines(first: 5) {
            edges {
              node { id }
            }
          }
        }
      """, %{}, %{current_user: Console.Services.Rbac.preload(user)})

      assert from_connection(found)
             |> ids_equal([other | pipes])
    end

    test "it can sideload gate statuses" do
      user = insert(:user)
      %{group: group} = insert(:group_member, user: user)
      pipe = insert(:pipeline, read_bindings: [%{group_id: group.id}])
      edge = insert(:pipeline_edge, pipeline: pipe)
      insert_list(2, :pipeline_gate, edge: edge, state: :pending)
      insert_list(3, :pipeline_gate, edge: edge, state: :closed)
      insert_list(1, :pipeline_gate, edge: edge, state: :open)

      {:ok, %{data: %{"pipelines" => found}}} = run_query("""
        query {
          pipelines(first: 5) {
            edges {
              node {
                status { pending closed }
              }
            }
          }
        }
      """, %{}, %{current_user: Console.Services.Rbac.preload(user)})

      [pipeline] = from_connection(found)

      assert pipeline["status"]["pending"] == 2
      assert pipeline["status"]["closed"] == 3
    end
  end

  describe "pipeline" do
    test "it can fetch a pipeline by id" do
      user = insert(:user)
      pipe = insert(:pipeline, read_bindings: [%{user_id: user.id}])

      {:ok, %{data: %{"pipeline" => found}}} = run_query("""
        query Pipe($id: ID!) {
          pipeline(id: $id) { id }
        }
      """, %{"id" => pipe.id}, %{current_user: user})

      assert found["id"] == pipe.id

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Pipe($id: ID!) {
          pipeline(id: $id) { id }
        }
      """, %{"id" => pipe.id}, %{current_user: insert(:user)})
    end

    test "it can fetch context history w/in a pipeline" do
      user = insert(:user)
      pipe = insert(:pipeline, read_bindings: [%{user_id: user.id}])
      hist = insert_list(3, :pipeline_context, pipeline: pipe)

      {:ok, %{data: %{"pipeline" => found}}} = run_query("""
        query Pipe($id: ID!) {
          pipeline(id: $id) {
            id
            contexts(first: 5) {
              edges { node { id } }
            }
          }
        }
      """, %{"id" => pipe.id}, %{current_user: user})

      assert found["id"] == pipe.id
      assert from_connection(found["contexts"])
             |> ids_equal(hist)
    end

    test "it can fetch pipeline context history w/in a pipeline stage" do
      user = insert(:user)
      pipe = insert(:pipeline, read_bindings: [%{user_id: user.id}])
      stage = insert(:pipeline_stage, pipeline: pipe)
      hists = insert_list(2, :pipeline_context_history, stage: stage)

      {:ok, %{data: %{"pipeline" => found}}} = run_query("""
        query Pipe($id: ID!) {
          pipeline(id: $id) {
            id
            stages {
              contextHistory(first: 5) {
                edges { node { id } }
              }
            }
          }
        }
      """, %{"id" => pipe.id}, %{current_user: user})

      assert found["id"] == pipe.id
      [%{"contextHistory" => found}] = found["stages"]
      assert from_connection(found)
             |> ids_equal(hists)
    end
  end

  describe "pipelineGate" do
    test "it can fetch a pipeline gate by id" do
      user = insert(:user)
      %{group: group} = insert(:group_member, user: user)
      pipe = insert(:pipeline, read_bindings: [%{group_id: group.id}])
      edge = insert(:pipeline_edge, pipeline: pipe)
      job = insert(:pipeline_gate, edge: edge, type: :job, state: :pending)

      {:ok, %{data: %{"pipelineGate" => gate}}} = run_query("""
        query Gate($id: ID!) {
          pipelineGate(id: $id) { id }
        }
      """, %{"id" => job.id}, %{current_user: Console.Services.Rbac.preload(user)})

      assert gate["id"] == job.id
    end

    test "users w/o permission cannot fetch" do
      pipe = insert(:pipeline)
      edge = insert(:pipeline_edge, pipeline: pipe)
      job = insert(:pipeline_gate, edge: edge, type: :job, state: :pending)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Gate($id: ID!) {
          pipelineGate(id: $id) { id }
        }
      """, %{"id" => job.id}, %{current_user: insert(:user)})
    end
  end

  describe "pipelineContext" do
    test "it can fetch a pipeline gate by id" do
      user = insert(:user)
      %{group: group} = insert(:group_member, user: user)
      pipe = insert(:pipeline, read_bindings: [%{group_id: group.id}])
      ctx = insert(:pipeline_context, pipeline: pipe)

      {:ok, %{data: %{"pipelineContext" => found}}} = run_query("""
        query Context($id: ID!) {
          pipelineContext(id: $id) { id }
        }
      """, %{"id" => ctx.id}, %{current_user: Console.Services.Rbac.preload(user)})

      assert found["id"] == ctx.id
    end

    test "users w/o permission cannot fetch" do
      user = insert(:user)
      pipe = insert(:pipeline)
      ctx = insert(:pipeline_context, pipeline: pipe)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Context($id: ID!) {
          pipelineContext(id: $id) { id }
        }
      """, %{"id" => ctx.id}, %{current_user: Console.Services.Rbac.preload(user)})
    end
  end

  describe "clusterGates" do
    test "it will fetch the gates configured for a cluster" do
      cluster = insert(:cluster)
      other   = insert(:cluster)
      job = insert(:pipeline_gate, type: :job, state: :pending, cluster: cluster)
      insert(:pipeline_gate, type: :job, state: :pending, cluster: other)
      insert(:pipeline_gate, type: :job, state: :open, cluster: cluster)
      insert(:pipeline_gate, type: :job, state: :closed, cluster: cluster)
      insert(:pipeline_gate, type: :approval)

      {:ok, %{data: %{"clusterGates" => [found]}}} = run_query("""
        query {
          clusterGates { id }
        }
      """, %{}, %{cluster: cluster})

      assert found["id"] == job.id
    end
  end

  describe "pagedClusterGates" do
    test "it will fetch the gates configured for a cluster" do
      cluster = insert(:cluster)
      other   = insert(:cluster)
      job = insert(:pipeline_gate, type: :job, state: :pending, cluster: cluster)
      insert(:pipeline_gate, type: :job, state: :pending, cluster: other)
      insert(:pipeline_gate, type: :job, state: :open, cluster: cluster)
      insert(:pipeline_gate, type: :job, state: :closed, cluster: cluster)
      insert(:pipeline_gate, type: :approval)

      {:ok, %{data: %{"pagedClusterGates" => found}}} = run_query("""
        query {
          pagedClusterGates(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{cluster: cluster})

      [node] = from_connection(found)
      assert node["id"] == job.id
    end
  end

  describe "clusterGate" do
    test "it can fetch a gate for a cluster" do
      cluster = insert(:cluster)
      other   = insert(:cluster)
      job = insert(:pipeline_gate, type: :job, state: :pending, cluster: cluster)

      {:ok, %{data: %{"clusterGate" => found}}} = run_query("""
        query Gate($id: ID!) {
          clusterGate(id: $id) { id }
        }
      """, %{"id" => job.id}, %{cluster: cluster})

      assert found["id"] == job.id

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Gate($id: ID!) {
          clusterGate(id: $id) { id }
        }
      """, %{"id" => job.id}, %{cluster: other})
    end
  end
end
