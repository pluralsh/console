defmodule Console.Schema.NotificationSinkTest do
  use Console.DataCase, async: true
  alias Console.Schema.NotificationSink

  describe "changeset/2" do
    test "accepts standard Slack and GovSlack webhook URLs" do
      for url <- [
            "https://hooks.slack.com/services/T00000000/B00000000/test",
            "https://hooks.slack-gov.com/services/T00000000/B00000000/test"
          ] do
        assert valid_sink?(:slack, url)
      end
    end

    test "accepts Microsoft Teams webhook URL hosts" do
      for url <- [
            "https://outlook.office.com/webhook/test",
            "https://environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/test/triggers/manual/paths/invoke?sig=test",
            "https://prod-01.westus.logic.azure.com:443/workflows/test/triggers/manual/paths/invoke?sig=test"
          ] do
        assert valid_teams_sink?(url)
      end
    end

    test "rejects userinfo hostname spoofing" do
      refute valid_sink?(:slack, "https://hooks.slack.com@example.com/services/test")

      refute valid_sink?(
               :teams,
               "https://environment.api.powerplatform.com@example.com/workflows/test"
             )
    end

    test "rejects suffix hostname spoofing" do
      refute valid_sink?(:slack, "https://hooks.slack.com.example.com/services/test")
      refute valid_sink?(:slack, "https://hooks.slack-gov.com.example.com/services/test")

      refute valid_sink?(
               :teams,
               "https://environment.api.powerplatform.com.example.com/workflows/test"
             )
    end

    test "rejects non-HTTPS URLs" do
      refute valid_sink?(:slack, "http://hooks.slack.com/services/test")
      refute valid_sink?(:teams, "http://environment.api.powerplatform.com/workflows/test")
    end
  end

  defp valid_teams_sink?(url), do: valid_sink?(:teams, url)

  defp valid_sink?(type, url) do
    %NotificationSink{}
    |> NotificationSink.changeset(%{
      name: "#{type}-sink",
      type: type,
      configuration: %{type => %{url: url}}
    })
    |> then(& &1.valid?)
  end
end
