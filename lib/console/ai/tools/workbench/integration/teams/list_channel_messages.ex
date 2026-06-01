defmodule Console.AI.Tools.Workbench.Integration.Teams.ListChannelMessages do
  @moduledoc """
  Lists recent messages in a Teams channel via Microsoft Graph
  [`GET /teams/{team-id}/channels/{channel-id}/messages`](https://learn.microsoft.com/en-us/graph/api/channel-list-messages?view=graph-rest-1.0).
  Pagination: pass **`odata_next_link`** set to the exact string from **`@odata.nextLink`** in the prior JSON response.
  """

  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.WorkbenchTool
  alias Console.AI.Tools.Workbench.Integration.Teams.{Client, Connection}

  embedded_schema do
    field :tool,             :map, virtual: true
    field :team_id,          :string
    field :channel_id,       :string
    field :odata_next_link, :string
    field :top,              :integer
  end

  @json_schema Console.priv_file!("tools/workbench/integration/teams/list_channel_messages.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "teams_list_channel_messages_#{name}"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "List recent messages in a Teams channel for #{name} (Graph `GET /teams/{team-id}/channels/{channel-id}/messages`). Use `team_id` from teams_list_teams and `channel_id` from teams_list_channels. Each message includes an `id` for teams_update_channel_message or teams_react_to_channel_message. Paginate with **`odata_next_link`** = prior **`@odata.nextLink`**."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(%__MODULE__{} = model, attrs) do
    model
    |> cast(attrs, [:team_id, :channel_id, :odata_next_link, :top])
    |> update_change(:team_id, &trim/1)
    |> update_change(:channel_id, &trim/1)
    |> update_change(:odata_next_link, &trim/1)
    |> validate_number(:top, greater_than_or_equal_to: 1, less_than_or_equal_to: 50)
    |> validate_ids_or_next_link()
  end

  def implement(%__MODULE__{tool: tool} = m) do
    Connection.with_client(tool, fn client ->
      case list_page(client, m) do
        {:ok, body} -> Jason.encode(body)
        {:error, reason} -> {:error, "Microsoft Graph list channel messages failed: #{inspect(reason)}"}
      end
    end)
  end

  defp list_page(client, %{odata_next_link: link}) when nonempty_string(link),
    do: Client.get(client, link, %{})

  defp list_page(client, %{team_id: team_id, channel_id: channel_id} = m) do
    path = "/teams/#{enc(team_id)}/channels/#{enc(channel_id)}/messages"
    params = maybe_top(%{}, m.top)
    Client.get(client, path, params)
  end

  defp maybe_top(params, top) when is_integer(top), do: Map.put(params, "$top", top)
  defp maybe_top(params, _), do: params

  defp trim(nil), do: nil
  defp trim(s) when is_binary(s), do: String.trim(s)

  defp validate_ids_or_next_link(cs) do
    if nonempty_string(get_field(cs, :odata_next_link)) do
      cs
    else
      validate_required(cs, [:team_id, :channel_id])
    end
  end

  defp enc(s), do: URI.encode(to_string(s), &URI.char_unreserved?/1)
end
