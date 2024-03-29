defmodule Console.Webhooks.Formatter.Piazza do
  use Console.Webhooks.Formatter

  @impl Formatter
  def format(%Build{} = build) do
    {:ok, %{structured_message: structured(build), text: text(build)}}
  end

  def structured(%Build{id: id, repository: repo, status: status}) do
    """
<root>
  <attachment accent="#{color(status)}" direction="row" pad="small" gap="xsmall" margin="small">
    <text>#{status_modifier(status)} #{repo} using console:</text>
    <link href="#{build_url(id)}">
      build logs
    </link>
  </attachment>
</root>
"""
  end
end
