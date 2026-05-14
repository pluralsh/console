defmodule Console.AI.Tools.Workbench.Integration.Teams.SearchGroups do
  @moduledoc """
  Searches Microsoft 365 **groups** (including but not limited to Teams) via [`GET /groups`](https://learn.microsoft.com/en-us/graph/api/group-list?view=graph-rest-1.0)
  using `contains` on `displayName`. Use **teams_search_teams** when you only want team-backed groups; this tool searches all groups the
  app can read (**Group.Read.All** or equivalent).
  Pagination: pass **`odata_next_link`** = the prior response's **`@odata.nextLink`**.
  """

  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.WorkbenchTool
  alias Console.AI.Tools.Workbench.Integration.Teams.{Client, Connection}

  embedded_schema do
    field :tool,             :map, virtual: true
    field :query,            :string
    field :odata_next_link, :string
    field :top,              :integer
  end

  @json_schema Console.priv_file!("tools/workbench/integration/teams/search_groups.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "teams_search_groups_#{name}"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "Search Microsoft 365 groups by display name for #{name} (Graph `GET /groups`). First page: `query`. Next pages: **`odata_next_link`** from **`@odata.nextLink`**."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(%__MODULE__{} = model, attrs) do
    model
    |> cast(attrs, [:query, :odata_next_link, :top])
    |> validate_number(:top, greater_than_or_equal_to: 1, less_than_or_equal_to: 100)
    |> validate_query_or_next_link()
  end

  def implement(%__MODULE__{tool: tool} = m) do
    Connection.with_client(tool, fn client ->
      case nonempty_string(m.odata_next_link) do
        true -> Client.get(client, m.odata_next_link, %{}, [])
        _ ->
          esc = odata_escape(m.query)
          down = String.downcase(esc)
          filter = "contains(tolower(displayName),'#{down}')"
          top = min(m.top || 25, 100)

          params = %{
            "$filter" => filter,
            "$select" => "id,displayName,description,mail,mailNickname,groupTypes",
            "$top" => top
          }

          Client.get(client, "/groups", params, [])
      end
      |> case do
        {:ok, body} -> Jason.encode(body)
        {:error, reason} -> {:error, "Microsoft Graph search groups failed: #{inspect(reason)}"}
      end
    end)
  end

  defp validate_query_or_next_link(cs) do
    if nonempty_string(get_field(cs, :odata_next_link)) do
      cs
    else
      cs
      |> validate_required([:query])
      |> validate_length(:query, min: 1, max: 200)
    end
  end

  defp odata_escape(s) when is_binary(s), do: String.replace(s, "'", "''")
end
