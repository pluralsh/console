defmodule Console.Deployments.PubSub.GovernanceTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.PubSub
  alias Console.Deployments.PubSub.Governance

  describe "PullRequestCreated" do
    test "it can handle a pull request created event" do
      governance = insert(:pr_governance, configuration: %{webhook: %{url: "https://webhook.url"}})
      pr = insert(:pull_request, governance: governance, status: :open)

      expect(HTTPoison, :post, fn "https://webhook.url/v1/open", _, _ ->
        state = Jason.encode!(%{service_now_id: "1234567890"})
        {:ok, %HTTPoison.Response{status_code: 200, body: state}}
      end)

      event = %PubSub.PullRequestCreated{item: pr}
      :ok = Governance.handle_event(event)

      assert refetch(pr).governance_state == %{"service_now_id" => "1234567890"}
    end
  end

  describe "PullRequestUpdated" do
    test "it can handle a pull request updated event" do
      governance = insert(:pr_governance, configuration: %{webhook: %{url: "https://webhook.url"}})
      pr = insert(:pull_request, governance: governance, status: :merged)

      expect(HTTPoison, :post, fn "https://webhook.url/v1/close", _, _ ->
        state = Jason.encode!(%{service_now_id: "1234567890"})
        {:ok, %HTTPoison.Response{status_code: 200, body: state}}
      end)

      event = %PubSub.PullRequestUpdated{item: pr}
      :ok = Governance.handle_event(event)
    end
  end
end
