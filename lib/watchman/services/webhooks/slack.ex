defmodule Watchman.Webhooks.Formatter.Slack do
  use Watchman.Webhooks.Formatter
  alias Watchman.Schema.Build

  @impl Formatter
  def format(%Build{status: status, repository: repo, id: id} = build) do
    cluster_name = Watchman.Services.Plural.cluster_name()
    {:ok, %{attachments: [
      %{
        color: color(status),
        blocks: [
          %{type: :section, text: %{
            type: "mrkdwn",
            text: "[cluster=#{cluster_name}] #{emoji(status)}#{status_modifier(status)} #{repo} using watchman: <#{build_url(id)}|build logs>"
          }}
        ]
      }
    ]}}
  end

  defp emoji(:successful), do: ":rocket: "
  defp emoji(_), do: ""
end
