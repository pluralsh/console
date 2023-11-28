defprotocol Console.Deployments.PubSub.Pipelineable do
  @fallback_to_any true
  alias Console.Schema.{PipelineStage, PipelinePromotion}

  @doc """
  Returns a stage/edge or nothing to drive a subsequent pipeline action
  """
  @spec pipe(term) :: PipelineStage.t | PipelinePromotion.t | :ok
  def pipe(event)
end

defimpl Console.Deployments.PubSub.Pipelineable, for: Any do
  def pipe(_), do: :ok
end

defimpl Console.Deployments.PubSub.Pipelineable, for: Console.PubSub.ServiceComponentsUpdated do
  def pipe(%{item: %{status: :healthy} = svc}) do
    case Console.Repo.preload(svc, [stage_services: :stage]) do
      %{stage_services: [_ | _] = ss} -> Enum.map(ss, & &1.stage)
      _ -> :ok
    end
  end
  def pipe(_), do: :ok
end

defimpl Console.Deployments.PubSub.Pipelineable, for: Console.PubSub.PipelineGateApproved do
  def pipe(%{item: gate}) do
    case Console.Repo.preload(gate, [edge: [from: :promotion]]) do
      %{edge: %{from: %{promotion: promo}}} -> promo
      _ -> :ok
    end
  end
end
