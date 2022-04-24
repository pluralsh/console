defmodule Console.Webhook.NotificationTest do
  use Console.DataCase, async: false
  use Mimic
  alias Kube.Application
  alias Console.PubSub.Consumers.Webhook
  alias Console.PubSub

  setup :set_mimic_global

  describe "NotificationCreated" do
    test "it will send a failed webhook" do
      notif = insert(:notification)
      %{url: url} = wh = insert(:webhook, type: :slack)

      myself = self()
      expect(HTTPoison, :post, fn ^url, payload, _ ->
        decoded = Jason.decode!(payload)
        send myself, {:payload, decoded}
        {:ok, decoded}
      end)

      expect(Kazan, :run, fn _ ->
        {:ok, %Application{spec: %Application.Spec{descriptor: %Application.Descriptor{icons: [%Application.Icon{src: "img"}]}}}}
      end)

      event = %PubSub.NotificationCreated{item: notif}
      Webhook.handle_event(event)

      assert_receive {:payload, %{"blocks" => [first, second, third]}}

      assert refetch(wh).health == :healthy

      assert first["text"]
      assert first["accessory"]["image_url"]

      assert second["text"]

      assert third["fields"]
    end
  end
end
