defmodule Console.Deployments.PubSub.PipelineTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.PubSub
  alias Console.Deployments.PubSub.Pipeline

  describe "ServiceComponentsUpdated" do
    test "it will attempt to create a promotion if healthy" do
      service = insert(:service, status: :healthy)
      ss = insert(:stage_service, service: service)
      expect(Console.Deployments.Pipelines.Discovery, :stage, & &1)

      event = %PubSub.ServiceComponentsUpdated{item: service}
      [s] = Pipeline.handle_event(event)

      assert s.id == ss.stage_id
    end

    test "it will ignore if stale" do
      service = insert(:service, status: :stale)
      insert(:stage_service, service: service)

      event = %PubSub.ServiceComponentsUpdated{item: service}
      :ok = Pipeline.handle_event(event)
    end

    test "it will ignore if not in a pipeline" do
      service = insert(:service, status: :healthy)

      event = %PubSub.ServiceComponentsUpdated{item: service}
      :ok = Pipeline.handle_event(event)
    end
  end

  describe "PipelineGateApproved" do
    test "it will attempt to apply a promotion on approval" do
      gate = insert(:pipeline_gate)
      promo = insert(:pipeline_promotion, stage: gate.edge.from)
      expect(Console.Deployments.Pipelines.Discovery, :promotion, & {:ok, &1})

      event = %PubSub.PipelineGateApproved{item: gate}
      {:ok, g} = Pipeline.handle_event(event)

      assert g.id == promo.id
    end
  end
end
