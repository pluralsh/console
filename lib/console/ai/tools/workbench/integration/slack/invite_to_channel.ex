defmodule Console.AI.Tools.Workbench.Integration.Slack.InviteToChannel do
  @max_users 100

  @moduledoc """
  Invites members to a channel via Slack [`conversations.invite`](https://api.slack.com/methods/conversations.invite).
  Optional user groups are expanded with [`usergroups.users.list`](https://api.slack.com/methods/usergroups.users.list).
  At most #{@max_users} user IDs are sent in a single call (Slack’s documented limit for `users`); larger sets are rejected.
  """
  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.{WorkbenchTool}
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.SlackConnection}
  alias Console.AI.Tools.Workbench.Integration.Slack.Client

  embedded_schema do
    field :tool,          :map, virtual: true
    field :channel_id,    :string
    field :user_ids,      {:array, :string}
    field :usergroup_id,  :string
    field :force,         :boolean, default: false
  end

  @json_schema Console.priv_file!("tools/workbench/integration/slack/invite_to_channel.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "slack_invite_to_channel_#{name}"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "Invite up to 100 Slack users to a channel for #{name} via conversations.invite. Use channel_id from slack_list_channels or slack_find_channel_by_name. Pass user_ids (U…) and/or usergroup_id (S… from slack_list_user_groups); groups are expanded via usergroups.users.list. More than 100 IDs after merge is an error (no batching)."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(%__MODULE__{} = model, attrs) do
    model
    |> cast(attrs, [:channel_id, :user_ids, :usergroup_id, :force])
    |> validate_required([:channel_id])
    |> validate_invite_targets()
  end

  def implement(%__MODULE__{
        tool: %WorkbenchTool{
          configuration: %Configuration{slack: %SlackConnection{bot_token: token}}
        },
        channel_id: channel_id,
        user_ids: user_ids,
        usergroup_id: usergroup_id,
        force: force
      })
      when nonempty_string(channel_id) do
    with {:ok, ids} <- resolve_user_ids(token, user_ids, usergroup_id),
         :ok <- validate_non_empty(ids),
         :ok <- validate_max_count(ids),
         {:ok, body} <-
           Client.post("conversations.invite", token, %{
             channel: channel_id,
             users: Enum.join(ids, ","),
             force: !!force
           }) do
      Jason.encode(body)
    else
      {:error, reason} when is_binary(reason) ->
        {:error, reason}

      {:error, reason} ->
        {:error, "Slack conversations.invite failed: #{inspect(reason)}"}
    end
  end

  def implement(%__MODULE__{}), do: {:error, "Slack bot token is not configured for this workbench tool."}

  defp validate_invite_targets(changeset) do
    case {get_field(changeset, :user_ids), get_field(changeset, :usergroup_id)} do
      {[], gid} when not nonempty_string(gid) -> add_error(changeset, :user_ids, "provide user_ids and/or usergroup_id")
      _ -> changeset
    end
  end

  defp resolve_user_ids(token, user_ids, usergroup_id) do
    with {:ok, from_group} <- usergroup_member_ids(token, usergroup_id) do
      {:ok, Enum.uniq(from_group ++ (user_ids || []))}
    end
  end

  defp usergroup_member_ids(_token, usergroup_id) when not nonempty_string(usergroup_id), do: {:ok, []}
  defp usergroup_member_ids(token, usergroup_id) do
    case Client.get("usergroups.users.list", token, %{usergroup: usergroup_id}) do
      {:ok, %{"users" => users}} when is_list(users) -> {:ok, users}

      {:ok, body} ->
        {:error, "Slack usergroups.users.list returned an unexpected body: #{inspect(body)}"}

      {:error, reason} ->
        {:error, "Slack usergroups.users.list failed: #{inspect(reason)}"}
    end
  end

  defp validate_non_empty([]), do: {:error, "no user IDs to invite after merging user_ids and usergroup members"}
  defp validate_non_empty(_), do: :ok

  defp validate_max_count(ids) when length(ids) > @max_users do
    {:error,
     "Slack conversations.invite allows at most #{@max_users} users per call; got #{length(ids)} after merging user_ids and usergroup_id. Narrow the list or invite in separate calls."}
  end
  defp validate_max_count(_), do: :ok
end
