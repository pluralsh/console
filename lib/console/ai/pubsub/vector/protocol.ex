defprotocol Console.AI.PubSub.Vectorizable do
  @fallback_to_any true

  @spec resource(any) :: {:ok, struct} | :ok
  def resource(struct)
end

defimpl Console.AI.PubSub.Vectorizable, for: Any do
  def resource(_), do: :ok
end

defimpl Console.AI.PubSub.Vectorizable, for: Console.PubSub.PullRequestCreated do
  alias Console.AI.Tool
  alias Console.AI.PubSub.Vector.Indexable
  alias Console.Deployments.Pr.Dispatcher
  alias Console.Schema.{PullRequest, ScmConnection}

  def resource(%@for{item: %PullRequest{status: s, url: url, flow_id: flow_id}})
      when s in ~w(merged closed)a and is_binary(flow_id) do
    with %ScmConnection{} = conn <- Tool.scm_connection(),
         {:ok, files} <- Dispatcher.files(conn, url),
      do: %Indexable{data: files, filters: [flow_id: flow_id]}
  end

  def resource(_), do: :ok
end


defimpl Console.AI.PubSub.Vectorizable, for: Console.PubSub.AlertResolutionCreated do
  alias Console.Schema.AlertResolution
  alias Console.AI.PubSub.Vector.Indexable

  def resource(%@for{item: resolution}) do
    mini = Console.Repo.preload(resolution, [:alert])
           |> AlertResolution.Mini.new()
    %Indexable{data: mini}
  end
end
