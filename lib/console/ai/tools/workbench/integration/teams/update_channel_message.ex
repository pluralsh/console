defmodule Console.AI.Tools.Workbench.Integration.Teams.UpdateChannelMessage do
  @moduledoc """
  Updates a channel message via Microsoft Graph [`PATCH /teams/{team-id}/channels/{channel-id}/messages/{message-id}`](https://learn.microsoft.com/en-us/graph/api/channel-message-update?view=graph-rest-1.0).
  Same delegated vs application permission caveats as posting; see Graph docs for your app registration.
  """

  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.WorkbenchTool
  alias Console.AI.Tools.Workbench.Integration.Teams.{Client, Connection}

  embedded_schema do
    field :tool,        :map, virtual: true
    field :team_id,     :string
    field :channel_id,  :string
    field :message_id,  :string
    field :text,        :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/teams/update_channel_message.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "teams_update_channel_message_#{name}"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "Edit an existing Teams channel message for #{name}. Pass `message_id` (`id` from teams_post_channel_message response, or from the Graph messages API if you have it)."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(%__MODULE__{} = model, attrs) do
    model
    |> cast(attrs, [:team_id, :channel_id, :message_id, :text])
    |> validate_required([:team_id, :channel_id, :message_id, :text])
    |> update_change(:team_id, &String.trim/1)
    |> update_change(:channel_id, &String.trim/1)
    |> update_change(:message_id, &String.trim/1)
  end

  def implement(%__MODULE__{tool: tool, team_id: tid, channel_id: cid, message_id: mid, text: text}) do
    Connection.with_client(tool, fn client ->
      path = "/teams/#{enc(tid)}/channels/#{enc(cid)}/messages/#{enc(mid)}"
      body = %{"body" => %{"contentType" => "text", "content" => text}}

      case Client.patch(client, path, body) do
        {:ok, resp} -> Jason.encode(resp)
        {:error, reason} -> {:error, "Microsoft Graph update channel message failed: #{inspect(reason)}"}
      end
    end)
  end

  defp enc(s), do: URI.encode(to_string(s), &URI.char_unreserved?/1)
end
