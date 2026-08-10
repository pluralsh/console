defmodule Console.AI.PubSub.VectorizableTest do
  use Console.DataCase, async: false

  alias Console.AI.PubSub.Vectorizable
  alias Console.PubSub

  describe "project insights opt-out" do
    test "skips every project-scoped vectorization event" do
      project = insert(:project, disable_insights: true)
      stack = insert(:stack, project: project, status: :successful)
      insert(:stack_state, stack: stack, state: [
        %{identifier: "aws_instance.web", resource: "aws_instance", name: "web", configuration: %{}}
      ])
      run = insert(:stack_run, stack: stack, status: :successful)

      cluster = insert(:cluster, project: project)
      service = insert(:service, cluster: cluster)
      insert(:service_component, service: service)

      assert :ok = Vectorizable.resource(%PubSub.StackUpdated{item: stack})
      assert :ok = Vectorizable.resource(%PubSub.StackRunCompleted{item: run})
      assert :ok = Vectorizable.resource(%PubSub.ServiceComponentsUpdated{item: service})
      assert :ok = Vectorizable.resource(%PubSub.ClusterPinged{item: cluster})
    end
  end
end
