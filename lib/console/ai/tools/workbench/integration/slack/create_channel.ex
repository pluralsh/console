defmodule Console.AI.Tools.Workbench.Integration.Slack.CreateChannel do
  @moduledoc """
  Creates a workspace channel via Slack [`conversations.create`](https://docs.slack.dev/reference/methods/conversations.create)
  (`POST https://slack.com/api/conversations.create`). Bot tokens need a channel-management scope such as `channels:manage` or
  `channels:write` (see Slack’s method reference).
  """
  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.{WorkbenchTool}
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.SlackConnection}
  alias Console.AI.Tools.Workbench.Integration.Slack.Client

  embedded_schema do
    field :tool,       :map, virtual: true
    field :name,       :string
    field :is_private, :boolean, default: false
  end

  @json_schema Console.priv_file!("tools/workbench/integration/slack/create_channel.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "slack_create_channel_#{name}"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "Create a public or private Slack channel for #{name} via conversations.create. Pass a valid channel `name` (lowercase letters, numbers, hyphens, underscores; max 80 characters per Slack). On success the response includes `channel.id` for slack_post_message."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(%__MODULE__{} = model, attrs) do
    model
    |> cast(attrs, [:name, :is_private])
    |> update_change(:name, &normalize_name/1)
    |> validate_required([:name])
    |> validate_length(:name, max: 80)
    |> validate_format(:name, ~r/\A[a-z0-9_-]+\z/,
      message: "must contain only lowercase letters, numbers, hyphens, and underscores"
    )
  end

  def implement(%__MODULE__{
    tool: %WorkbenchTool{
      configuration: %Configuration{slack: %SlackConnection{bot_token: token}}
    },
    name: name,
    is_private: is_private
  })  do

    case Client.post("conversations.create", token, %{name: name, is_private: !!is_private}) do
      {:ok, body} -> Jason.encode(body)

      {:error, reason} ->
        {:error, "Slack conversations.create failed: #{inspect(reason)}"}
    end
  end

  defp normalize_name(raw) when is_binary(raw) do
    raw
    |> String.trim()
    |> String.trim_leading("#")
    |> String.downcase()
  end
  defp normalize_name(_), do: nil
end
