defmodule Console.AI.Tools.Workbench.Integration.Teams.ListTeams do
  @moduledoc """
  Lists Microsoft Teams in the tenant via Microsoft Graph [`GET /groups`](https://learn.microsoft.com/en-us/graph/api/group-list)
  filtered to team-enabled groups (`resourceProvisioningOptions/Any(c:c eq 'Team')`).
  Pagination: pass **`odata_next_link`** set to the exact string from **`@odata.nextLink`** in the prior JSON response.
  """

  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.WorkbenchTool
  alias Console.AI.Tools.Workbench.Integration.Teams.{Client, Connection}

  embedded_schema do
    field :tool,             :map, virtual: true
    field :odata_next_link, :string
    field :top,             :integer
  end

  @json_schema Console.priv_file!("tools/workbench/integration/teams/list_teams.json") |> Jason.decode!()

  @filter "resourceProvisioningOptions/Any(c:c eq 'Team')"
  @select "id,displayName,description,visibility"

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "teams_list_teams_#{name}"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "List Microsoft Teams for #{name} via Microsoft Graph (team-enabled Microsoft 365 groups). Use returned `id` as `team_id` for teams_list_channels. Paginate by passing **`odata_next_link`** = the prior response's **`@odata.nextLink`** string."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(%__MODULE__{} = model, attrs) do
    model
    |> cast(attrs, [:odata_next_link, :top])
    |> validate_number(:top, greater_than_or_equal_to: 1, less_than_or_equal_to: 999)
  end

  def implement(%__MODULE__{tool: tool} = m) do
    Connection.with_client(tool, fn client ->
      case list_page(client, m) do
        {:ok, body} -> Jason.encode(body)
        {:error, reason} -> {:error, "Microsoft Graph list teams failed: #{inspect(reason)}"}
      end
    end)
  end

  defp list_page(client, %{odata_next_link: link}) when nonempty_string(link),
    do: Client.get(client, link, %{})

  defp list_page(client, m) do
    params = maybe_put_top(%{
      "$filter" => @filter,
      "$select" => @select,
      "$orderby" => "displayName"
    }, m.top)

    Client.get(client, "/groups", params)
  end

  defp maybe_put_top(params, top) when is_integer(top), do: Map.put(params, "$top", top)
  defp maybe_put_top(params, _), do: params
end
