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
          initialized: false,
        },
        provider: :openai,
        openai: %{access_token: "key"}
      })
      drop_index(vector_index())

      insert(:scm_connection, default: true, type: :gitlab)
      flow = insert(:flow)
      mr = insert(:pull_request, flow: flow, status: :merged, url: "https://gitlab.com/owner/repo/-/merge_requests/1")

      # Mock OpenAI embeddings call
      expect(Console.AI.OpenAI, :embeddings, fn _, text -> {:ok, [{text, vector()}]} end)

      # Single HTTPoison mock to handle all GitLab API calls
      expect(HTTPoison, :get, fn "https://gitlab.com/api/v4/projects/owner%2Frepo/merge_requests/1", _ ->
        IO.puts("Base MR api call")
        {:ok, %HTTPoison.Response{
          status_code: 200,
          body: Jason.encode!(%{
            "sha" => "sha",
            "title" => "Test MR",
            "target_branch" => "main",
            "source_branch" => "feature"
          })
        }}
      end)
      expect(HTTPoison, :get, fn "https://gitlab.com/api/v4/projects/owner%2Frepo/merge_requests/1/changes", _ ->
        IO.puts("Changes api call")
        {:ok, %HTTPoison.Response{
          status_code: 200,
          body: Jason.encode!(%{
            "changes" => [%{
              "new_path" => "terraform/main.tf",
              "old_path" => "terraform/main.tf",
              "diff" => "example diff"
            }]
          })
        }}
      end)
      expect(HTTPoison, :get, fn "https://gitlab.com/owner/repo/-/raw/sha/terraform/main.tf" ->
        IO.puts("Raw file api call")
        {:ok, %HTTPoison.Response{
          status_code: 200,
          body: "terraform content"
        }}
      end)

      event = %PubSub.PullRequestCreated{item: mr}
      Consumer.handle_event(event)
      refresh(vector_index())

      {:ok, c} = count_index(vector_index())
      IO.inspect(c, label: "c")
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
      pr = insert(:pull_request, flow: flow, status: :merged, url: "https://bitbucket.org/workspace/repo/pull-requests/1")

      expect(Console.AI.OpenAI, :embeddings, fn _, text -> {:ok, [{text, vector()}]} end)

      expect(HTTPoison, :get, fn "bitbucket.diff_url" ->
        {:ok, %HTTPoison.Response{
          status_code: 200,
          body: "diff --git a\nsamplediff"
        }}
      end)
      expect(HTTPoison, :get, fn "bitbucket.diffstat_url" ->
        {:ok, %HTTPoison.Response{
          status_code: 200,
          body: Jason.encode!(%{
            "values" => [%{
              "new" => %{
                "escaped_path" => "terraform/main.tf",
                "links" => %{"self" => %{"href" => "bitbucket.raw_url"}}
              }
            }]
          })
        }}
      end)
      expect(HTTPoison, :get, fn "https://api.bitbucket.org/2.0/repositories/workspace/repo/pullrequests/1", _ ->
        {:ok, %HTTPoison.Response{
          status_code: 200,
          body: Jason.encode!(%{
            "links" => %{
              "diff" => %{"href" => "bitbucket.diff_url"},
              "diffstat" => %{"href" => "bitbucket.diffstat_url"}
            },
            "title" => "Test PR",
            "source" => %{
              "repository" => %{"full_name" => "workspace/repo"},
              "commit" => %{"hash" => "sha"},
              "branch" => %{"name" => "feature"}
            },
            "destination" => %{
              "branch" => %{"name" => "main"}
            }
          })
        }}
      end)
      expect(HTTPoison, :get, fn "bitbucket.raw_url" ->
        {:ok, %HTTPoison.Response{
          status_code: 200,
          body: "terraform content"
        }}
      end)

      event = %PubSub.PullRequestCreated{item: pr}
      Consumer.handle_event(event)
      refresh(vector_index())

      {:ok, c} = count_index(vector_index())
      IO.inspect(c, label: "c")
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
