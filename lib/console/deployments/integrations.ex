defmodule Console.Deployments.Integrations do
  use Console.Services.Base
  use Nebulex.Caching
  import Console.Deployments.Policies
  alias Console.Schema.{ChatConnection, IssueWebhook, User, Issue}
  alias Console.PubSub

  @ttl :timer.minutes(120)
  @cache Console.conf(:cache_adapter)
  @chat_connection_limit 20

  @type chat_connection_resp :: {:ok, ChatConnection.t} | Console.error
  @type issue_webhook_resp :: {:ok, IssueWebhook.t} | Console.error
  @type issue_webhooks_resp :: {:ok, [IssueWebhook.t]} | Console.error
  @type issue_resp :: {:ok, Issue.t} | Console.error
  @type error :: Console.error

  def get_chat_connection!(id), do: Repo.get!(ChatConnection, id)
  def get_chat_connection(id), do: Repo.get(ChatConnection, id)
  def get_chat_connection_by_name!(name), do: Repo.get_by!(ChatConnection, name: name)
  def get_chat_connection_by_name(name), do: Repo.get_by(ChatConnection, name: name)

  def get_issue_webhook(id), do: Repo.get(IssueWebhook, id)
  def get_issue_webhook!(id), do: Repo.get!(IssueWebhook, id)
  def get_issue_webhook_by_name(name), do: Repo.get_by(IssueWebhook, name: name)
  def get_issue_webhook_by_name!(name), do: Repo.get_by!(IssueWebhook, name: name)

  @decorate cacheable(cache: @cache, key: {:issue_webhook, external_id}, opts: [ttl: @ttl])
  def get_issue_webhook_by_ext_id(external_id), do: Repo.get_by(IssueWebhook, external_id: external_id)

  def get_issue(id), do: Repo.get(Issue, id)
  def get_issue!(id), do: Repo.get!(Issue, id)
  def get_issue_by_ext_id(external_id), do: Repo.get_by(Issue, external_id: external_id)
  def get_issue_by_ext_id!(external_id), do: Repo.get_by!(Issue, external_id: external_id)

  @doc """
  Will upsert a chat connection, fails if a user isn't an admin
  """
  @spec upsert_chat_connection(map, User.t) :: chat_connection_resp
  def upsert_chat_connection(%{name: name} = attrs, %User{} = user) do
    start_transaction()
    |> add_operation(:existing, fn _ ->
      Repo.get_by(ChatConnection, name: name)
      |> Repo.preload([:read_bindings, :write_bindings])
      |> ok()
    end)
    |> add_operation(:limit, fn
      %{existing: %ChatConnection{}} -> {:ok, :existing}
      %{existing: nil} -> check_chat_connection_limit()
    end)
    |> add_operation(:connection, fn %{existing: existing} ->
      case existing do
        %ChatConnection{} = conn -> conn
        nil -> %ChatConnection{name: name}
      end
      |> ChatConnection.changeset(attrs)
      |> allow(user, :write)
      |> when_ok(&Repo.insert_or_update/1)
    end)
    |> execute(extract: :connection)
  end

  @doc """
  Will delete a chat connection, fails if a user isn't an admin
  """
  @spec delete_chat_connection(binary, User.t) :: chat_connection_resp
  def delete_chat_connection(id, %User{} = user) do
    get_chat_connection!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
  end

  @doc """
  Creates an issue webhook. Fails if the user is not an admin.
  """
  @spec create_issue_webhook(map, User.t) :: issue_webhook_resp
  def create_issue_webhook(attrs, %User{} = user) do
    %IssueWebhook{}
    |> IssueWebhook.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(:insert)
    |> notify(:create)
  end

  @doc """
  Updates an issue webhook by id. Fails if the user is not an admin.
  """
  @spec update_issue_webhook(map, binary, User.t) :: issue_webhook_resp
  def update_issue_webhook(attrs, id, %User{} = user) do
    get_issue_webhook!(id)
    |> Repo.preload([:read_bindings, :write_bindings])
    |> IssueWebhook.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(:update)
    |> notify(:update)
  end

  @doc """
  Deletes an issue webhook by id. Fails if the user is not an admin.
  """
  @spec delete_issue_webhook(binary, User.t) :: issue_webhook_resp
  def delete_issue_webhook(id, %User{} = user) do
    get_issue_webhook!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
    |> notify(:delete)
  end

  defp check_chat_connection_limit do
    case Repo.aggregate(ChatConnection, :count) do
      count when count >= @chat_connection_limit -> {:error, "this instance is at the chat connection limit"}
      _ -> {:ok, :create}
    end
  end

  defp notify({:ok, %IssueWebhook{} = webhook}, :create),
    do: handle_notify(PubSub.IssueWebhookCreated, webhook)
  defp notify({:ok, %IssueWebhook{} = webhook}, :update),
    do: handle_notify(PubSub.IssueWebhookUpdated, webhook)
  defp notify({:ok, %IssueWebhook{} = webhook}, :delete),
    do: handle_notify(PubSub.IssueWebhookDeleted, webhook)
  defp notify({:ok, %Issue{} = issue}, :create), do: handle_notify(PubSub.IssueCreated, issue)
  defp notify({:ok, %Issue{} = issue}, :update), do: handle_notify(PubSub.IssueUpdated, issue)
  defp notify(pass, _), do: pass

  @doc """
  Upserts an issue keyed by external id.
  """
  @spec upsert_issue(%{external_id: binary}) :: issue_resp
  def upsert_issue(%{external_id: external_id} = attrs) do
    extant = get_issue_by_ext_id(external_id)
    related = related_issue(attrs)
    attrs = inherit_issue_scope(attrs, extant || related)

    start_transaction()
    |> add_operation(:issue, fn _ -> persist_issue(extant, attrs) end)
    |> add_operation(:related, fn %{issue: issue} -> sync_related_issue_statuses(issue, attrs) end)
    |> execute()
    |> notify_issue_sync(extant)
  end

  defp persist_issue(%Issue{} = issue, attrs) do
    Issue.changeset(issue, attrs)
    |> Repo.update()
  end
  defp persist_issue(nil, %{workbench_id: id} = attrs) when is_binary(id), do: insert_issue(attrs)
  defp persist_issue(nil, %{flow_id: id} = attrs) when is_binary(id), do: insert_issue(attrs)
  defp persist_issue(nil, _), do: {:ok, nil}

  defp insert_issue(%{external_id: external_id} = attrs) do
    %Issue{external_id: external_id}
    |> Issue.changeset(attrs)
    |> Repo.insert()
  end

  defp notify_issue_sync({:ok, %{issue: issue, related: related}}, extant) do
    Enum.each(related, &notify({:ok, &1}, :update))

    case {issue, related} do
      {%Issue{} = issue, _} -> notify({:ok, issue}, issue_delta(extant))
      {nil, [issue | _]} -> {:ok, issue}
      {nil, []} -> {:error, "issue has no workbench or flow"}
    end
  end
  defp notify_issue_sync(error, _), do: error

  defp issue_delta(%Issue{}), do: :update
  defp issue_delta(_), do: :create

  defp related_issue(
    %{provider: :github, status: status, url: url, payload: %{"pull_request" => _} = payload}
  ) when status in [:open, :completed, :cancelled] and is_binary(url) and not is_map_key(payload, "comment") do
    github_issues_for_reference(url)
    |> Repo.all()
    |> sole_owner()
  end
  defp related_issue(_), do: nil

  defp sole_owner(issues) do
    Enum.uniq_by(issues, & {&1.workbench_id, &1.flow_id})
    |> case do
      [%Issue{} = issue] -> issue
      _ -> nil
    end
  end

  defp inherit_issue_scope(attrs, %Issue{} = issue) do
    Enum.reduce(~w(workbench_id workbench_webhook_id flow_id)a, attrs, fn key, attrs ->
      case {Map.get(attrs, key), Map.get(issue, key)} do
        {nil, id} when is_binary(id) -> Map.put(attrs, key, id)
        _ -> attrs
      end
    end)
  end
  defp inherit_issue_scope(attrs, _), do: attrs

  defp sync_related_issue_statuses(issue, %{provider: :github, status: status, url: url, payload: %{"pull_request" => _} = payload})
    when status in [:open, :completed, :cancelled] and is_binary(url) and not is_map_key(payload, "comment") do
    github_issues_for_reference(url)
    |> Repo.all()
    |> Enum.reject(&same_issue?(&1, issue))
    |> Enum.reduce_while({:ok, []}, &sync_issue_status(&1, &2, status))
  end
  defp sync_related_issue_statuses(_, _), do: {:ok, []}

  defp same_issue?(%Issue{id: id}, %Issue{id: id}), do: true
  defp same_issue?(_, _), do: false

  defp sync_issue_status(%Issue{} = issue, {:ok, synced}, status) do
    Issue.changeset(issue, %{status: status})
    |> Repo.update()
    |> case do
      {:ok, issue} -> {:cont, {:ok, [issue | synced]}}
      {:error, error} -> {:halt, {:error, error}}
    end
  end

  defp github_issues_for_reference(url) do
    Issue.for_references(:github, github_reference_urls(url))
  end

  defp github_reference_urls(url) do
    case github_reference_identity(url) do
      {repository_url, number} ->
        [url, "#{repository_url}/issues/#{number}", "#{repository_url}/pull/#{number}"]
        |> Enum.uniq()
      _ -> [url]
    end
  end

  defp github_reference_identity(url) do
    uri = URI.parse(url)

    case Regex.run(~r{^(.+)/(?:issues|pull)/(\d+)/?$}, uri.path || "") do
      [_, repository_path, number] ->
        repository_url = URI.to_string(%{uri | path: repository_path, query: nil, fragment: nil})
        {repository_url, number}
      _ -> nil
    end
  end
end
