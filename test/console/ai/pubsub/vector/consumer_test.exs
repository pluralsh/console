defmodule Console.AI.PubSub.Vector.ConsumerTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.PubSub
  alias Console.AI.PubSub.Vector.Consumer
  import ElasticsearchUtils

  describe "ScmWebhook" do
    test "it can vector index pr files" do
      deployment_settings(ai: %{
        enabled: true,
        vector_store: %{
          enabled: true,
          store: :elastic,
          elastic: es_vector_settings(),
        },
        provider: :openai,
        openai: %{access_token: "key"}
      })
      drop_index(vector_index())

      hook = insert(:scm_webhook, type: :github)
      insert(:scm_connection, default: true, type: :github)

      expect(Console.AI.OpenAI, :embeddings, fn _, text -> {:ok, [{text, vector()}]} end)
      expect(Tentacat.Pulls.Files, :list, fn _, _, _, _ ->
        {:ok, [%{
          "filename" => "terraform/main.tf",
          "sha" => "sha",
          "raw_url" => "https://test.url",
          "patch" => "example diff",
        }], %HTTPoison.Response{status_code: 200}}
      end)
      expect(HTTPoison, :get, fn "https://test.url", _, [follow_redirect: true] -> {:ok, %HTTPoison.Response{status_code: 200, body: "terraform"}} end)

      event = %PubSub.ScmWebhook{
        item: %{
          "action" => "closed",
          "pull_request" => %{"merged" => true, "html_url" => "https://github.com/owner/repo/pull/1"},
        },
        actor: hook
      }
      Consumer.handle_event(event)
      refresh(vector_index())

      {:ok, c} = count_index(vector_index())
      assert c > 0
    end
  end

  describe "AlertResolutionCreated" do
    test "it can vector index alerts" do
      deployment_settings(ai: %{
        enabled: true,
        vector_store: %{
          enabled: true,
          store: :elastic,
          elastic: es_vector_settings(),
        },
        provider: :openai,
        openai: %{access_token: "key"}
      })
      drop_index(vector_index())

      alert = insert(:alert)
      resolution = insert(:alert_resolution, alert: alert)

      expect(Console.AI.OpenAI, :embeddings, fn _, text -> {:ok, [{text, vector()}]} end)

      event = %PubSub.AlertResolutionCreated{item: resolution}
      Consumer.handle_event(event)
      refresh(vector_index())

      {:ok, c} = count_index(vector_index())
      assert c > 0
    end
  end
end
