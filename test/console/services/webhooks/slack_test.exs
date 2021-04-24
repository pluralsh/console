defmodule Console.Webhooks.Formatter.SlackTest do
  use Console.DataCase, async: true
  alias Console.Webhooks.Formatter.Slack

  describe "format/1" do
    test "It can format successful builds" do
      build = insert(:build, status: :successful)

      {:ok, %{attachments: [%{color: color, blocks: [%{text: %{text: text}}]}]}} = Slack.format(build)

      assert color == "#007a5a"
      assert text =~ build.repository
      assert text =~ build.id
    end

    test "It can format unsuccessful builds" do
      build = insert(:build, status: :failed)

      {:ok, %{attachments: [%{color: color, blocks: [%{text: %{text: text}}]}]}} = Slack.format(build)

      assert color == "#CC4400"
      assert text =~ build.repository
      assert text =~ build.id
    end
  end
end
