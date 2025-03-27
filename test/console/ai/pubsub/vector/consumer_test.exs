defmodule Console.AI.PubSub.Vector.ConsumerTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.PubSub
  alias Console.AI.PubSub.Vector.Consumer
  import ElasticsearchUtils

  describe "PullRequestCreated" do
    test "it can vector index pr files from github" do
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

    test "it can vector index pr files from gitlab" do
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

      insert(:scm_connection, default: true, type: :gitlab)
      flow = insert(:flow)
      pr = insert(:pull_request, flow: flow, status: :merged, url: "https://gitlab.com/owner/repo/-/merge_requests/1")

      expect(Console.AI.OpenAI, :embeddings, fn _, text -> {:ok, [{text, vector()}]} end)
      expect(HTTPoison, :get, fn url, _ ->
        if String.contains?(url, "/merge_requests/1/changes") do
          {:ok, %HTTPoison.Response{
            status_code: 200,
            body: Jason.encode!(%{
              "changes" => [%{
                "new_path" => "terraform/main.tf",
                "old_path" => "terraform/main.tf",
                "diff" => "example diff",
                "new_file" => false,
                "deleted_file" => false,
                "renamed_file" => false
              }]
            })
          }}
        else
          {:error, "unexpected URL"}
        end
      end)

      event = %PubSub.PullRequestCreated{item: pr}
      Consumer.handle_event(event)
      refresh(vector_index())

      {:ok, c} = count_index(vector_index())
      assert c > 0

      settings = Console.Deployments.Settings.fetch_consistent()
      assert settings.ai.vector_store.initialized
    end

    test "it can vector index pr files from bitbucket" do
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

      insert(:scm_connection, default: true, type: :bitbucket)
      flow = insert(:flow)
      pr = insert(:pull_request, flow: flow, status: :merged, url: "https://bitbucket.org/owner/repo/pull-requests/1")

      expect(Console.AI.OpenAI, :embeddings, fn _, text -> {:ok, [{text, vector()}]} end)
      expect(HTTPoison, :get, fn url, _ ->
        if String.contains?(url, "/pullrequests/1") do
          {:ok, %HTTPoison.Response{
            status_code: 200,
            body: Jason.encode!(%{
              "title" => "Test PR"
            })
          }}
        else
          {:error, "unexpected URL"}
        end
      end)
      expect(HTTPoison, :get, fn url, _ ->
        if String.contains?(url, "/diff") do
          {:ok, %HTTPoison.Response{
            status_code: 200,
            body: """
            diff --git a/terraform/main.tf b/terraform/main.tf
            index abc123..def456 100644
            --- a/terraform/main.tf
            +++ b/terraform/main.tf
            @@ -1,3 +1,4 @@
            +added line
            existing line
            """
          }}
        else
          {:error, "unexpected URL"}
        end
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
