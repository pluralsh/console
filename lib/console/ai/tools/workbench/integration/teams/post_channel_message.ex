defmodule Console.AI.Tools.Workbench.Integration.Teams.PostChannelMessage do
  @moduledoc """
  Posts a message to a Teams channel using Microsoft Graph [`POST /teams/{team-id}/channels/{channel-id}/messages`](https://learn.microsoft.com/en-us/graph/api/channel-post-messages?view=graph-rest-1.0).

  **Permissions:** In delegated flows the least-privileged permission is **ChannelMessage.Send**. Application (client-credentials) posting to
  standard channels is limited by Microsoft to migration scenarios (**Teamwork.Migrate.All**); normal bot-style posting typically requires a delegated token.
  See the Graph documentation linked above for your tenant configuration.
  """

  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.WorkbenchTool
  alias Console.AI.Tools.Workbench.Integration.Teams.{Client, Connection}

  embedded_schema do
    field :tool,        :map, virtual: true
    field :team_id,    :string
    field :channel_id, :string
    field :text,       :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/teams/post_channel_message.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "teams_post_channel_message_#{name}"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "Post a message to a Teams channel for #{name} (Graph channel messages API). Use `team_id` from teams_list_teams / teams_search_teams and `channel_id` from teams_list_channels (`id` on each channel). Body is plain text (`contentType`: text)."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(%__MODULE__{} = model, attrs) do
    model
    |> cast(attrs, [:team_id, :channel_id, :text])
    |> validate_required([:team_id, :channel_id, :text])
  end

  def implement(%__MODULE__{tool: tool, team_id: tid, channel_id: cid, text: text}) do
    Connection.with_client(tool, fn client ->
      path = "/teams/#{enc(tid)}/channels/#{enc(cid)}/messages"
      body = %{"body" => %{"contentType" => "text", "content" => text}}

      case Client.post(client, path, body) do
        {:ok, resp} -> Jason.encode(resp)
        {:error, reason} -> {:error, "Microsoft Graph post channel message failed: #{inspect(reason)}"}
      end
    end)
  end

  defp enc(s), do: URI.encode(to_string(s), &URI.char_unreserved?/1)
end
