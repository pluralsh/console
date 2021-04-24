defmodule Console.Webhooks.Formatter.Slack do
  use Console.Webhooks.Formatter
  alias Console.Schema.Build

  @impl Formatter
  def format(%Build{status: status, repository: repo, id: id} = build) do
    cluster_name = Console.Services.Plural.cluster_name()
    {:ok, %{attachments: [
      %{
        color: color(status),
        blocks: [
          %{type: :section, text: %{
            type: "mrkdwn",
            text: "[cluster=#{cluster_name}] #{emoji(status)}#{status_modifier(status)} #{repo} using watchman: <#{build_url(id)}|build logs>\n\n#{build.message}"
          }}
        ]
      }
    ]}}
  end

  defp emoji(:successful), do: ":rocket: "
  defp emoji(_), do: ""
end
