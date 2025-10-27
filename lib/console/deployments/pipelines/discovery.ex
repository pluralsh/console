defmodule Console.Deployments.Pipelines.Discovery do
  @moduledoc """
  Responsible for determining which node a given pipeline worker is running on, along with the shard to
  accept the work
  """
  alias Console.Schema.{PipelinePromotion, PipelineStage}
  alias Console.Deployments.Pipelines.{PromotionWorker, StageWorker}

  @shards 10
  @shard_ring HashRing.new() |> HashRing.add_nodes(Enum.to_list(0..@shards))

  def promotion(%PipelinePromotion{id: id} = promo),
    do: maybe_rpc(id, __MODULE__, :dispatch, [promo])

  def stage(%PipelineStage{id: id} = stage),
    do: maybe_rpc(id, __MODULE__, :dispatch, [stage])

  def revert(%PipelineStage{id: id} = stage),
    do: maybe_rpc(id, __MODULE__, :do_revert, [stage])

  def context(%PipelineStage{id: id} = stage),
    do: maybe_rpc(id, __MODULE__, :stage_context, [stage])

  def dispatch(%PipelinePromotion{id: id} = promo), do: PromotionWorker.dispatch(worker_shard(id), promo)
  def dispatch(%PipelineStage{id: id} = stage), do: StageWorker.dispatch(worker_shard(id), stage)

  def do_revert(%PipelineStage{id: id} = stage), do: StageWorker.revert(worker_shard(id), stage)

  def stage_context(%PipelineStage{id: id} = stage), do: StageWorker.context(worker_shard(id), stage)

  def shards(), do: @shards

  def worker_shard(id), do: HashRing.key_to_node(@shard_ring, id)

  def worker_node(id), do: Console.ClusterRing.node(id)

  def local?(id), do: worker_node(id) == node()

  defp maybe_rpc(id, module, func, args) do
    me = node()
    case worker_node(id) do
      ^me -> apply(module, func, args)
      node -> :rpc.call(node, module, func, args)
    end
  end
end
