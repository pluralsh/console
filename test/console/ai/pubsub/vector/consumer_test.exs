defmodule Console.AI.PubSub.Vector.ConsumerTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.PubSub
  alias Console.AI.PubSub.Vector.Consumer
  import ElasticsearchUtils

  describe "PullRequestCreated" do
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

      insert(:scm_connection, default: true, type: :github)
      flow = insert(:flow)
      pr = insert(:pull_request, flow: flow, status: :merged, url: "https://github.com/owner/repo/pull/1")

      expect(Console.AI.OpenAI, :embeddings, fn _, text -> {:ok, [{text, vector()}]} end)
      expect(Tentacat.Pulls, :find, fn _, "owner", "repo", "1" ->
        {:ok, %{"merged" => true, "html_url" => "https://github.com/owner/repo/pull/1"}, %{}}
      end)
      expect(Tentacat.Pulls.Files, :list, fn _, _, _, _ ->
        {:ok, [%{
          "filename" => "terraform/main.tf",
          "sha" => "sha",
          "contents_url" => "https://test.url",
          "patch" => "example diff",
        }], %HTTPoison.Response{status_code: 200}}
      end)
      expect(HTTPoison, :get, fn "https://test.url", _ ->
        {:ok, %HTTPoison.Response{status_code: 200, body: Jason.encode!(%{"content" => Base.encode64("terraform")})}}
      end)

      event = %PubSub.PullRequestCreated{item: pr}
      Consumer.handle_event(event)
      refresh(vector_index())

      {:ok, c} = count_index(vector_index())
      assert c > 0

      settings = Console.Deployments.Settings.fetch_consistent()
      assert settings.ai.vector_store.initialized
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
