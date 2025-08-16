defmodule Console.GraphQl.Deployments.PipelineMutationsTest do
  use Console.DataCase, async: true

  describe "savePipeline" do
    test "it will create a new pipeline" do
      user = admin_user()
      [svc, svc2] = insert_list(2, :service)

      {:ok, %{data: %{"savePipeline" => pipeline}}} = run_query("""
        mutation Save($name: String!, $attributes: PipelineAttributes!) {
          savePipeline(name: $name, attributes: $attributes) {
            id
            name
            stages {
              id
              name
              services {
                id
                service { id }
                criteria { source { id } secrets }
              }
            }
            edges { from { id } to { id } gates { type name cluster { id } } }
          }
        }
      """, %{"name" => "test", "attributes" => %{
        "stages" => [
          %{"name" => "dev", "services" => [%{"name" => svc.name, "handle" => svc.cluster.handle}]},
          %{"name" => "prod", "services" => [
            %{"name" => svc2.name, "handle" => svc2.cluster.handle, "criteria" => %{
              "name" => svc.name,
              "handle" => svc.cluster.handle,
              "secrets" => ["test-secret"]
            }}
          ]}
        ],
        "edges" => [
          %{"from" => "dev", "to" => "prod", "gates" => [
            %{"type" => "JOB", "clusterId" => svc2.cluster_id, "name" => "approve"}
          ]}
        ]
      }}, %{current_user: user})

      assert pipeline["id"]
      assert pipeline["name"] == "test"
      %{"dev" => dev, "prod" => prod} = Map.new(pipeline["stages"], & {&1["name"], &1})

      assert dev["name"] == "dev"
      assert hd(dev["services"])["service"]["id"] == svc.id

      assert prod["name"] == "prod"
      %{"services" => [service]} = prod
      assert service["service"]["id"] == svc2.id
      assert service["criteria"]["source"]["id"] == svc.id
      assert service["criteria"]["secrets"] == ["test-secret"]

      [edge] = pipeline["edges"]

      assert edge["from"]["id"] == dev["id"]
      assert edge["to"]["id"] == prod["id"]

      [gate] = edge["gates"]

      assert gate["type"] == "JOB"
      assert gate["name"] == "approve"
      assert gate["cluster"]["id"] == svc2.cluster_id
    end
  end

  describe "approveGate" do
    test "writers can approve an approval gate" do
      user = insert(:user)
      pipeline = insert(:pipeline, write_bindings: [%{user_id: user.id}])
      gate = insert(:pipeline_gate, edge: build(:pipeline_edge, pipeline: pipeline))

      {:ok, %{data: %{"approveGate" => approved}}} = run_query("""
        mutation Approve($id: ID!) {
          approveGate(id: $id) { id state }
        }
      """, %{"id" => gate.id}, %{current_user: user})

      assert approved["id"] == gate.id
      assert approved["state"] == "OPEN"
    end
  end

  describe "forceGate" do
    test "writers can force a gate open" do
      user = insert(:user)
      pipeline = insert(:pipeline, write_bindings: [%{user_id: user.id}])
      gate = insert(:pipeline_gate, type: :window, edge: build(:pipeline_edge, pipeline: pipeline))

      {:ok, %{data: %{"forceGate" => forced}}} = run_query("""
        mutation Force($id: ID!) {
          forceGate(id: $id) { id state }
        }
      """, %{"id" => gate.id}, %{current_user: user})

      assert forced["id"] == gate.id
      assert forced["state"] == "OPEN"
    end
  end

  describe "updateGate" do
    test "an agent can update a gate it owns" do
      cluster = insert(:cluster)
      job = insert(:pipeline_gate, type: :job, state: :pending, cluster: cluster)

      {:ok, %{data: %{"updateGate" => updated}}} = run_query("""
        mutation Update($id: ID!, $state: GateState!) {
          updateGate(id: $id, attributes: {state: $state}) { id state }
        }
      """, %{"id" => job.id, "state" => "OPEN"}, %{cluster: cluster})

      assert updated["id"] == job.id
      assert updated["state"] == "OPEN"
    end
  end

  describe "deletePipeline" do
    test "it can delete a pipeline by id" do
      admin = admin_user()
      pipe = insert(:pipeline)

      {:ok, %{data: %{"deletePipeline" => del}}} = run_query("""
        mutation Delete($id: ID!) {
          deletePipeline(id: $id) { id }
        }
      """, %{"id" => pipe.id}, %{current_user: admin})

      assert del["id"] == pipe.id
      refute refetch(pipe)
    end
  end

  describe "createPipelineContext" do
    test "it can create a context by pipeline id" do
      pipe = insert(:pipeline)

      {:ok, %{data: %{"createPipelineContext" => ctx}}} = run_query("""
        mutation Create($name: String!, $attributes: PipelineContextAttributes!) {
          createPipelineContext(pipelineName: $name, attributes: $attributes) {
            id
            context
            pipeline { id }
          }
        }
      """, %{
        "name" => pipe.name,
        "attributes" => %{"context" => Jason.encode!(%{some: "context"})}
      }, %{current_user: admin_user()})

      assert ctx["id"]
      assert ctx["pipeline"]["id"] == pipe.id
      assert ctx["context"] == %{"some" => "context"}
    end
  end
end
