defprotocol Console.Deployments.PubSub.Governable do
  @fallback_to_any true

  @doc """
  Handles an event for a governance workflow
  """
  @spec reconcile(term) :: :ok | {:error, any}
  def reconcile(event)
end

defimpl Console.Deployments.PubSub.Governable, for: Any do
  def reconcile(_), do: :ok
end

defimpl Console.Deployments.PubSub.Governable, for: Console.PubSub.PullRequestCreated do
  alias Console.Repo
  alias Console.Schema.PullRequest
  alias Console.Deployments.Pr.Governance.Provider

  def reconcile(%@for{item: %PullRequest{governance_id: id} = pr}) when is_binary(id) do
    with %PullRequest{} = pr = Repo.preload(pr, [:governance]),
         {:ok, result} <- Provider.open(pr),
         {:ok, _} <- add_state(pr, result) do
      :ok
    end
  end
  def reconcile(_), do: :ok

  def add_state(%PullRequest{} = pr, state) do
    pr
    |> PullRequest.changeset(%{governance_state: state})
    |> Repo.update()
  end
end


defimpl Console.Deployments.PubSub.Governable, for: Console.PubSub.PullRequestUpdated do
  alias Console.Repo
  alias Console.Schema.PullRequest
  alias Console.Deployments.Pr.Governance.Provider

  def reconcile(%@for{item: %PullRequest{governance_id: id, status: status} = pr}) when is_binary(id) and status in [:merged, :closed] do
    with %PullRequest{} = pr = Repo.preload(pr, [:governance]),
         {:ok, _} <- Provider.close(pr) do
      :ok
    end
  end
  def reconcile(_), do: :ok
end
