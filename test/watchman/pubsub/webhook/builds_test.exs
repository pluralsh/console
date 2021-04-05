defmodule Watchman.Webhook.BuildTest do
  use Watchman.DataCase, async: false
  use Mimic
  alias Watchman.PubSub.Consumers.Webhook
  alias Watchman.PubSub

  setup :set_mimic_global

  describe "BuildFailed" do
    test "it will send a failed webhook" do
      build = insert(:build, status: :failed)
      %{url: url} = wh = insert(:webhook, type: :slack)

      myself = self()
      expect(HTTPoison, :post, fn ^url, payload, _ ->
        decoded = Jason.decode!(payload)
        send myself, {:payload, decoded}
        {:ok, decoded}
      end)

      event = %PubSub.BuildFailed{item: build}
      Webhook.handle_event(event)

      assert_receive {:payload, payload}

      %{"attachments" => [%{"blocks" => [%{
        "type" => "section",
        "text" => %{"type" => "mrkdwn"}
      }]}]} = payload

      assert refetch(wh).health == :healthy
    end
  end

  describe "BuildSucceeded" do
    test "it will send a succeeded webhook" do
      build = insert(:build, status: :successful)
      %{url: url} = wh = insert(:webhook, type: :slack)

      myself = self()
      expect(HTTPoison, :post, fn ^url, payload, _ ->
        decoded = Jason.decode!(payload)
        send myself, {:payload, decoded}
        {:ok, decoded}
      end)

      event = %PubSub.BuildSucceeded{item: build}
      Webhook.handle_event(event)

      assert_receive {:payload, payload}

      %{"attachments" => [%{"blocks" => [%{
        "type" => "section",
        "text" => %{"type" => "mrkdwn"}
      }]}]} = payload

      assert refetch(wh).health == :healthy
    end
  end
end
