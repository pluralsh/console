defmodule Console.Deployments.GlobalCronTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.Deployments.Cron
  alias Console.Schema.{PipelineStage, PipelinePromotion}

  setup :set_mimic_global

  describe "#scan_pipeline_stages" do
    test "it will dispatch the given pipeline stage" do
      %{id: id} = insert(:pipeline_stage)
      me = self()
      expect(Console.Deployments.Pipelines, :build_promotion, fn %PipelineStage{id: ^id} ->
        {:ok, send(me, :done)}
      end)

      Cron.scan_pipeline_stages()

      assert_receive :done
    end
  end

  describe "#scan_pending_promotions" do
    test "it can scan pending promotions" do
      past = Timex.now() |> Timex.shift(minutes: -1)
      %{id: id} = insert(:pipeline_promotion, revised_at: Timex.now(), promoted_at: past)
      insert(:pipeline_promotion, revised_at: past, promoted_at: Timex.now())
      me = self()
      expect(Console.Deployments.Pipelines, :apply_promotion, fn %PipelinePromotion{id: ^id} ->
        {:ok, send(me, :done)}
      end)

      Cron.scan_pending_promotions()

      assert_receive :done
    end
  end
end
