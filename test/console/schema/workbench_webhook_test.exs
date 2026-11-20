defmodule Console.Schema.WorkbenchWebhookTest do
  use Console.DataCase, async: true

  alias Console.Schema.WorkbenchWebhook

  describe "matches?/2" do
    test "matches regexes with omitted optional case insensitive options" do
      webhook = %WorkbenchWebhook{matches: %WorkbenchWebhook.Matches{regex: "grafana", case_insensitive: nil}}

      assert WorkbenchWebhook.matches?(webhook, "grafana alert")
      refute WorkbenchWebhook.matches?(webhook, "Grafana alert")
    end

    test "does not match regexes with malformed case insensitive options" do
      webhook = %WorkbenchWebhook{matches: %WorkbenchWebhook.Matches{regex: "grafana", case_insensitive: "true"}}

      refute WorkbenchWebhook.matches?(webhook, "grafana alert")
    end

    test "does not match malformed persisted regexes" do
      webhook = %WorkbenchWebhook{matches: %WorkbenchWebhook.Matches{regex: "[grafana", case_insensitive: false}}

      refute WorkbenchWebhook.matches?(webhook, "grafana alert")
    end

    test "matches regexes with valid case insensitive options" do
      insensitive = %WorkbenchWebhook{matches: %WorkbenchWebhook.Matches{regex: "grafana", case_insensitive: true}}
      sensitive = %WorkbenchWebhook{matches: %WorkbenchWebhook.Matches{regex: "grafana", case_insensitive: false}}

      assert WorkbenchWebhook.matches?(insensitive, "Grafana alert")
      refute WorkbenchWebhook.matches?(sensitive, "Grafana alert")
      assert WorkbenchWebhook.matches?(sensitive, "grafana alert")
    end
  end
end
