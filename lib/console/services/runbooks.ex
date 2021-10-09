defmodule Console.Services.Runbooks do
  alias Kube.{Runbook, Client}
  alias Console.Schema.User
  alias Console.Runbooks

  @type error :: {:error, term}

  @spec runbook(binary, binary) :: {:ok, Runbook.t} | error
  def runbook(namespace, name) do
    Client.get_runbook(namespace, name)
  end

  @spec list_runbooks(binary, atom) :: {:ok, [Runbook.t]} | error
  def list_runbooks(namespace, maybe_pinned \\ :unpinned) do
    with {:ok, %{items: items}} <- Client.list_runbooks(namespace, args(maybe_pinned)),
      do: {:ok, items}
  end

  defp args(:pinned), do: %{labelSelector: "platform.plural.sh/pinned"}
  defp args(_), do: %{}

  @spec datasources(Runbook.t) :: {:ok, [map]} | error
  def datasources(%Runbook{spec: %{datasources: sources}} = book, context \\ nil) do
    Task.async_stream(sources, &Runbooks.Data.extract(&1, Map.put(book, :context, context || %{})))
    |> Console.stream_result()
  end

  @spec execute(Runbook.t, binary, binary, map, User.t) :: {:ok | :error, term}
  def execute(%Runbook{spec: %{actions: actions}}, action, repo, ctx, %User{} = user) do
    actor = Runbooks.Actor.build(repo, ctx, user)
    with %Runbook.Action{} = act <- Enum.find(actions, & &1.name == action),
         {:ok, _} <- Runbooks.Actor.enact(act, actor),
      do: action_response(act)
  end

  defp action_response(%Runbook.Action{redirect_to: redirect}) when is_binary(redirect),
    do: {:ok, %{redirect_to: redirect}}
  defp action_response(_), do: {:ok, %{}}
end
