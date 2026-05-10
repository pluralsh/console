defmodule Console.AI.Tools.Workbench.Integration.Slack.FindChannelByName do
  @moduledoc """
  Finds a workspace channel whose Slack `name` matches the given string by paging
  `conversations.list` (public/private the bot can see). There is no name-lookup Slack
  API for ordinary bot installs—this scans list results until a match or pages are exhausted.
  """
  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.{WorkbenchTool}
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.SlackConnection}
  alias Console.AI.Tools.Workbench.Integration.Slack.Client

  @channel_types "public_channel,private_channel"

  # Guard against enormous workspaces looping forever.
  @max_pages 50

  embedded_schema do
    field :tool, :map, virtual: true
    field :name, :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/slack/find_channel_by_name.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: tool_name}}), do: "slack_find_channel_by_name_#{tool_name}"

  def description(%__MODULE__{tool: %WorkbenchTool{name: tool_name}}),
    do: "Resolve a Slack channel id for #{tool_name} by channel name (e.g. general). Matches the workspace channel `name` field (omit #), case-insensitive."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(%__MODULE__{} = model, attrs) do
    model
    |> cast(attrs, [:name])
    |> validate_required([:name])
    |> update_change(:name, &normalize_name/1)
    |> validate_required([:name])
  end

  def implement(%__MODULE__{
    tool: %WorkbenchTool{configuration: %Configuration{slack: %SlackConnection{bot_token: token}}},
    name: wanted
  }) when nonempty_string(wanted) do
    case find_channel(token, wanted, nil, 0) do
      {:ok, channel} -> Jason.encode(%{"ok" => true, "channel" => channel})

      :not_found ->
        {:error, "No Slack channel found with name \"#{wanted}\" (searched #{@max_pages} pages of conversations.list)."}

      {:error, reason} ->
        {:error, "Slack conversations.list failed while resolving channel name: #{inspect(reason)}"}
    end
  end

  def implement(%__MODULE__{}), do: {:error, "Slack bot token is not configured for this workbench tool."}

  defp normalize_name(raw) when is_binary(raw) do
    raw
    |> String.trim()
    |> String.trim_leading("#")
    |> String.downcase()
  end

  defp normalize_name(nil), do: nil

  defp find_channel(token, wanted, cursor, page) when page < @max_pages do
    params = maybe_put_cursor(%{types: @channel_types, limit: 200}, cursor)

    with {:ok, %{"channels" => [_ | _] = channels} = body} <- Client.get("conversations.list", token, params),
         {:channel, %{} = channel, _body} <- {:channel, Enum.find(channels, &name_match?(&1, wanted)), body} do
      {:ok, channel}
    else
      {:channel, _, %{"response_metadata" => %{"next_cursor" => next_cursor}}} when nonempty_string(next_cursor) ->
        find_channel(token, wanted, next_cursor, page + 1)
      {:channel, _, _} ->
        :not_found
      {:ok, body} ->
        {:error, {:unexpected_body, body}}

      {:error, _} = err ->
        err
    end
  end

  defp find_channel(_token, _wanted, _cursor, _page), do: :not_found

  defp name_match?(%{"name" => n}, wanted) when is_binary(n), do: String.downcase(n) == wanted
  defp name_match?(_, _wanted), do: false

  defp maybe_put_cursor(args, cursor) when nonempty_string(cursor), do: Map.put(args, :cursor, cursor)
  defp maybe_put_cursor(args, _), do: args
end
