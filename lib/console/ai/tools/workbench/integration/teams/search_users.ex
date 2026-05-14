defmodule Console.AI.Tools.Workbench.Integration.Teams.SearchUsers do
  @moduledoc """
  Searches users in the directory via Microsoft Graph [`GET /users`](https://learn.microsoft.com/en-us/graph/api/user-list?view=graph-rest-1.0)
  using an OData `$filter` with `contains` on `displayName`, `mail`, and `userPrincipalName` (case-insensitive via `tolower`).
  Pagination: pass **`odata_next_link`** = the prior response's **`@odata.nextLink`** (same pattern as list tools).
  Requires application permissions such as **User.Read.All** (see [Graph permissions](https://learn.microsoft.com/en-us/graph/permissions-reference)).
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

  @json_schema Console.priv_file!("tools/workbench/integration/teams/search_users.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "teams_search_users_#{name}"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "Search Azure AD / Microsoft 365 users for #{name} (Graph `GET /users`). First page: `query` substring. Next pages: **`odata_next_link`** from **`@odata.nextLink`**."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(%__MODULE__{} = model, attrs) do
    model
    |> cast(attrs, [:query, :odata_next_link, :top])
    |> update_change(:query, &trim/1)
    |> update_change(:odata_next_link, &trim/1)
    |> validate_number(:top, greater_than_or_equal_to: 1, less_than_or_equal_to: 100)
    |> validate_query_or_next_link()
  end

  def implement(%__MODULE__{tool: tool} = m) do
    Connection.with_client(tool, fn client ->
      case nonempty_string(m.odata_next_link) do
        true -> Client.get(client, m.odata_next_link, %{}, [])
        _ -> Client.get(client, "/users", %{
          "$filter" => user_filter(odata_escape(m.query)),
          "$select" => "id,displayName,mail,userPrincipalName",
          "$top" => min(m.top || 25, 100)
        }, [])
      end
      |> case do
        {:ok, body} -> Jason.encode(body)
        {:error, reason} -> {:error, "Microsoft Graph search users failed: #{inspect(reason)}"}
      end
    end)
  end

  defp trim(nil), do: nil
  defp trim(s) when is_binary(s), do: String.trim(s)

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

  defp user_filter(escaped) do
    down = String.downcase(escaped)

    "contains(tolower(displayName),'#{down}') or contains(tolower(mail),'#{down}') or contains(tolower(userPrincipalName),'#{down}')"
  end
end
