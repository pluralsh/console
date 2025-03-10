defprotocol Console.AI.PubSub.Vectorizable do
  @fallback_to_any true

  @spec resource(any) :: {:ok, struct} | :ok
  def resource(struct)
end

defimpl Console.AI.PubSub.Vectorizable, for: Any do
  def resource(_), do: :ok
end

defimpl Console.AI.PubSub.Vectorizable, for: Console.PubSub.ScmWebhook do
  alias Console.AI.Tool
  alias Console.Deployments.Pr.Dispatcher
  alias Console.Schema.{ScmWebhook, ScmConnection}
  require Logger

  def resource(%@for{
    item: %{"action" => "closed", "pull_request" => %{"merged" => true} = pr},
    actor: %ScmWebhook{type: :github}
  }) do
    with %ScmConnection{} = conn <- Tool.scm_connection(),
      do: Dispatcher.files(conn, pr)
  end

  def resource(_), do: :ok
end


defimpl Console.AI.PubSub.Vectorizable, for: Console.PubSub.AlertResolutionCreated do
  alias Console.Schema.AlertResolution

  def resource(%@for{item: resolution}) do
    mini = Console.Repo.preload(resolution, [:alert])
           |> AlertResolution.Mini.new()
    {:ok, mini}
  end
end
