defmodule Console.AI.Tools.Workbench.Integration.Teams.ListChannels do
  @moduledoc """
  Lists channels in a team via Microsoft Graph [`GET /teams/{team-id}/channels`](https://learn.microsoft.com/en-us/graph/api/channel-list?view=graph-rest-1.0).
  Pagination: pass **`odata_next_link`** set to the exact string from **`@odata.nextLink`** in the prior JSON response.
  """

  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.WorkbenchTool
  alias Console.AI.Tools.Workbench.Integration.Teams.{Client, Connection}

  embedded_schema do
    field :tool,             :map, virtual: true
    field :team_id,          :string
    field :odata_next_link, :string
    field :top,              :integer
  end

  @json_schema Console.priv_file!("tools/workbench/integration/teams/list_channels.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "teams_list_channels_#{name}"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "List Microsoft Teams channels for #{name} (Graph `GET /teams/{team-id}/channels`). First page needs `team_id` from teams_list_teams. Paginate with **`odata_next_link`** = prior **`@odata.nextLink`**."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(%__MODULE__{} = model, attrs) do
    model
    |> cast(attrs, [:team_id, :odata_next_link, :top])
    |> validate_number(:top, greater_than_or_equal_to: 1, less_than_or_equal_to: 100)
    |> update_change(:team_id, &String.trim/1)
    |> update_change(:odata_next_link, &String.trim/1)
  end

  def implement(%__MODULE__{tool: tool} = m) do
    Connection.with_client(tool, fn client ->
      case list_page(client, m) do
        {:ok, body} -> Jason.encode(body)
        {:error, reason} -> {:error, "Microsoft Graph list channels failed: #{inspect(reason)}"}
      end
    end)
  end

  defp list_page(client, %{odata_next_link: link}) when nonempty_string(link),
    do: Client.get(client, link, %{})

  defp list_page(client, %{team_id: team_id} = m) do
    path = "/teams/#{enc(team_id)}/channels"
    params = maybe_top(%{}, m.top)
    Client.get(client, path, params)
  end

  defp maybe_top(params, top) when is_integer(top), do: Map.put(params, "$top", top)
  defp maybe_top(params, _), do: params

  defp enc(s), do: URI.encode(to_string(s), &URI.char_unreserved?/1)
end
