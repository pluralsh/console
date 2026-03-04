defmodule Console.Deployments.Integrations do
  use Console.Services.Base
  use Nebulex.Caching
  import Console.Deployments.Policies
  alias Console.Schema.{ChatConnection, IssueWebhook, User, Issue}
  alias Console.PubSub

  @ttl :timer.minutes(120)
  @cache Console.conf(:cache_adapter)

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
    case Repo.get_by(ChatConnection, name: name) do
      %ChatConnection{} = conn -> conn
      nil -> %ChatConnection{name: name}
    end
    |> ChatConnection.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(&Repo.insert_or_update/1)
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

    case extant do
      %Issue{} = issue -> issue
      nil -> %Issue{external_id: external_id}
    end
    |> Issue.changeset(attrs)
    |> Repo.insert_or_update()
    |> notify(if is_nil(extant), do: :create, else: :update)
  end
end
