defmodule Console.Webhooks.Formatter.Slack do
  use Console.Webhooks.Formatter
  alias Console.Schema.{Build, Notification}
  alias Console.Services.Plural

  @impl Formatter
  def format(%Build{status: status, repository: repo, id: id} = build) do
    cluster_name = Plural.cluster_name()
    {:ok, %{attachments: [
      %{
        color: color(status),
        blocks: [
          section(text: mrkdwn(
            text: "[cluster=#{cluster_name}] #{emoji(status)}#{status_modifier(status)} #{repo} using console: <#{build_url(id)}|build logs>\n\n#{build.message}"
          ))
        ]
      }
    ]}}
  end

  def format(%Notification{title: title, description: desc, repository: repo, severity: sev, annotations: anns, labels: labels}) do
    {:ok, app} = Plural.application(repo)
    cluster_name = Plural.cluster_name()
    {:ok, %{
      blocks: [
        section(
          text: mrkdwn(text: "New Notification in cluster: #{cluster_name} for #{repo}\n*#{title}*"),
          accessory: image(image_url: Plural.app_icon(app), alt_text: repo)
        ),
        section(text: mrkdwn(text: desc)),
        section(fields: [
          mrkdwn(text: "*Severity*\n#{sev}"),
          mrkdwn(text: "*Annotations*\n#{format_pairs(anns)}"),
          mrkdwn(text: "*Labels*\n#{format_pairs(labels)}")
        ])
      ]
    }}
  end

  defp section(attrs), do: block(:section, attrs)

  defp mrkdwn(attrs), do: block(:mrkdwn, attrs)

  defp image(attrs), do: block(:image, attrs)

  defp format_pairs(pairs) do
    Enum.map(pairs, fn {k, v} -> "*#{k}*: #{v}" end)
    |> Enum.join(" ")
  end

  defp block(type, attrs) do
    Map.new(attrs)
    |> Map.put(:type, type)
  end

  defp emoji(:successful), do: ":rocket: "
  defp emoji(_), do: ""
end
