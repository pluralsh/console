defmodule Console.Services.Runbooks do
  use Console.Services.Base
  alias Kube.{Runbook, Client, ConfigurationOverlay}
  alias Console.Schema.{User, RunbookExecution}
  alias Console.Services.{Plural}
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
  def execute(%Runbook{spec: %{actions: actions}} = book, action, repo, ctx, %User{} = user) do
    actor = Runbooks.Actor.build(repo, ctx, user)
    with %Runbook.Spec.Actions{} = act <- Enum.find(actions, & &1.name == action) do
      start_transaction()
      |> add_operation(:enact, fn _ -> Runbooks.Actor.enact(act, actor) end)
      |> add_operation(:record, fn _ ->
        %RunbookExecution{user_id: user.id}
        |> RunbookExecution.changeset(%{
          name: book.metadata.name,
          namespace: book.metadata.namespace,
          context: ctx
        })
        |> Console.Repo.insert()
      end)
      |> add_operation(:resp, fn _ -> action_response(act) end)
      |> execute(extract: :resp)
    end
  end

  def execute_overlay(repo, ctx, actor) do
    with {:ok, vals} <- Plural.values_file(repo),
         {:ok, map} <- YamlElixir.read_from_string(vals),
         {:ok, %{items: overlays}} <- Kube.Client.list_configuration_overlays(repo),
         map <- make_updates(overlays, map, ctx),
         {:ok, doc} <- Ymlr.document(map),
         {:ok, _, build} <- Console.Deployer.update(repo, String.trim_leading(doc, "---\n"), :helm, nil, actor),
      do: {:ok, build}
  end

  defp make_updates(overlays, values, map) do
    Enum.reduce(overlays, values, fn %ConfigurationOverlay{spec: %ConfigurationOverlay.Spec{updates: updates, name: from}}, acc ->
      case Map.get(map, from, :ignore) do
        :ignore -> acc
        val ->
          Enum.reduce(updates, acc, fn %ConfigurationOverlay.Spec.Updates{path: path}, acc ->
            Console.put_path(acc, path, val)
          end)
      end
    end)
  end

  defp action_response(%Runbook.Spec.Actions{redirect_to: redirect}) when is_binary(redirect),
    do: {:ok, %{redirect_to: redirect}}
  defp action_response(_), do: {:ok, %{}}
end
