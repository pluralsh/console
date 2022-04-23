defmodule Console.Services.WebhooksTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.Services.Webhooks

  describe "#create" do
    test "It will create a new webhook" do
      {:ok, wh} = Webhooks.create(%{url: "https://example.com"})

      assert wh.health == :healthy
      assert wh.type == :slack
      assert wh.url == "https://example.com"
    end
  end

  describe "#delete" do
    test "it can delete a webhook" do
      hook = insert(:webhook)

      {:ok, del} = Webhooks.delete(hook.id)

      assert del.id == hook.id
      refute refetch(hook)
    end
  end

  describe "#deliver" do
    test "It will post to the configured url, and mark healthy when successful" do
      %{url: url} = wh = insert(:webhook)
      expect(HTTPoison, :post, fn ^url, _, _ -> {:ok, %{}} end)
      build = insert(:build, status: :successful)

      {:ok, result} = Webhooks.deliver(build, wh)

      assert result.health == :healthy
    end

    test "It will post to the url, and mark unhealthy if unsuccessful" do
      %{url: url} = wh = insert(:webhook)
      expect(HTTPoison, :post, fn ^url, _, _ -> {:error, %{}} end)
      build = insert(:build, status: :successful)

      {:ok, result} = Webhooks.deliver(build, wh)

      assert result.health == :unhealthy
    end
  end
end
