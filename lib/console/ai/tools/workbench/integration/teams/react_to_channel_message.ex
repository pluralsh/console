defmodule Console.AI.Tools.Workbench.Integration.Teams.ReactToChannelMessage do
  @moduledoc """
  Adds a reaction to a Teams channel message via Microsoft Graph
  [`POST /teams/{team-id}/channels/{channel-id}/messages/{message-id}/setReaction`](https://learn.microsoft.com/en-us/graph/api/chatmessage-setreaction?view=graph-rest-1.0).

  **Permissions:** Requires **ChannelMessage.Send** in delegated flows. Application (client-credentials) tokens are not supported for this API.
  """

  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.WorkbenchTool
  alias Console.AI.Tools.Workbench.Integration.Teams.{Client, Connection}

  embedded_schema do
    field :tool,        :map, virtual: true
    field :team_id,     :string
    field :channel_id,  :string
    field :message_id,  :string
    field :reaction,    :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/teams/react_to_channel_message.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "teams_react_to_channel_message_#{name}"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "Add an emoji reaction to a Teams channel message for #{name} (Graph setReaction). Pass `message_id` (`id`) from teams_list_channel_messages or teams_post_channel_message. `reaction` must be a Unicode emoji (e.g. 👍, 👀)."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(%__MODULE__{} = model, attrs) do
    model
    |> cast(attrs, [:team_id, :channel_id, :message_id, :reaction])
    |> validate_required([:team_id, :channel_id, :message_id, :reaction])
    |> update_change(:team_id, &String.trim/1)
    |> update_change(:channel_id, &String.trim/1)
    |> update_change(:message_id, &String.trim/1)
    |> update_change(:reaction, &String.trim/1)
  end

  def implement(%__MODULE__{tool: tool, team_id: tid, channel_id: cid, message_id: mid, reaction: reaction}) do
    Connection.with_client(tool, fn client ->
      path = "/teams/#{enc(tid)}/channels/#{enc(cid)}/messages/#{enc(mid)}/setReaction"
      body = %{"reactionType" => reaction}

      case Client.post(client, path, body) do
        {:ok, resp} -> Jason.encode(resp)
        {:error, reason} -> {:error, "Microsoft Graph setReaction failed: #{inspect(reason)}"}
      end
    end)
  end

  defp enc(s), do: URI.encode(to_string(s), &URI.char_unreserved?/1)
end
