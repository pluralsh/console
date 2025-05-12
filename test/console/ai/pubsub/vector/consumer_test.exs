defmodule Console.AI.PubSub.Vector.ConsumerTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.PubSub
  alias Console.AI.PubSub.Vector.Consumer
  alias ElasticsearchUtils, as: ES
  alias OpensearchUtils, as: OS

  describe "PullRequestCreated" do
    test "it can vector index pr files from github" do
      deployment_settings(ai: %{
        enabled: true,
        vector_store: %{
          enabled: true,
          store: :elastic,
          elastic: ES.es_vector_settings(),
        },
        provider: :openai,
        openai: %{access_token: "key"}
      })
      ES.drop_index(ES.vector_index())

      insert(:scm_connection, default: true, type: :github)
      flow = insert(:flow)
      pr = insert(:pull_request, flow: flow, status: :merged, url: "https://github.com/owner/repo/pull/1")

      expect(Console.AI.OpenAI, :embeddings, fn _, text -> {:ok, [{text, ES.vector()}]} end)
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
      ES.refresh(ES.vector_index())

      {:ok, c} = ES.count_index(ES.vector_index())
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
          elastic: ES.es_vector_settings(),
          initialized: false,
        },
        provider: :openai,
        openai: %{access_token: "key"}
      })
      ES.drop_index(ES.vector_index())

      insert(:scm_connection, default: true, type: :gitlab)
      flow = insert(:flow)
      mr = insert(:pull_request, flow: flow, status: :merged, url: "https://gitlab.com/owner/repo/-/merge_requests/1")

      # Mock OpenAI embeddings call
      expect(Console.AI.OpenAI, :embeddings, fn _, text -> {:ok, [{text, ES.vector()}]} end)

      # Mock the api to get MR changes
      expect(HTTPoison, :get, fn "https://gitlab.com/api/v4/projects/owner%2Frepo/merge_requests/1/changes", _ ->
        {:ok, %HTTPoison.Response{
          status_code: 200,
          body: Jason.encode!(%{
            "sha" => "sha",
            "title" => "Test MR",
            "target_branch" => "main",
            "source_branch" => "feature",
            "changes" => [%{
              "new_path" => "terraform/main.tf",
              "old_path" => "terraform/main.tf",
              "diff" => "example diff"
            }]
          })
        }}
      end)

      # Mock the api to get the file content
      expect(HTTPoison, :get, fn "https://gitlab.com/api/v4/projects/owner%2Frepo/repository/files/terraform%2Fmain.tf?ref=sha", _ ->
        {:ok, %HTTPoison.Response{
          status_code: 200,
          body: Jason.encode!(%{
            "content" => Base.encode64("terraform content")
          })
        }}
      end)

      event = %PubSub.PullRequestCreated{item: mr}
      Consumer.handle_event(event)
      ES.refresh(ES.vector_index())

      {:ok, c} = ES.count_index(ES.vector_index())
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
          elastic: ES.es_vector_settings(),
        },
        provider: :openai,
        openai: %{access_token: "key"}
      })
      ES.drop_index(ES.vector_index())

      insert(:scm_connection, default: true, type: :bitbucket)
      flow = insert(:flow)
      pr = insert(:pull_request, flow: flow, status: :merged, url: "https://bitbucket.org/workspace/repo/pull-requests/1")

      expect(Console.AI.OpenAI, :embeddings, fn _, text -> {:ok, [{text, ES.vector()}]} end)

      # Mock the API to get the PR info
      expect(HTTPoison, :get, fn "https://api.bitbucket.org/2.0/repositories/workspace/repo/pullrequests/1", _ ->
        {:ok, %HTTPoison.Response{
          status_code: 200,
          body: Jason.encode!(%{
            "links" => %{
              # In bitbucket API, the diff and diffstat URLs are part of the PR info response
              "diff" => %{"href" => "https://api.bitbucket.org/2.0/diff_url"},
              "diffstat" => %{"href" => "https://api.bitbucket.org/2.0/diffstat_url"}
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

      # See above mock, the basic PR info api provides an URL to get the diff
      expect(HTTPoison, :get, fn "https://api.bitbucket.org/2.0/diff_url", _ ->
        {:ok, %HTTPoison.Response{
          status_code: 200,
          body: "diff --git a\nsamplediff"
        }}
      end)

      # See above mock, the basic PR info api provides an URL to get the diffstat
      # The diffstat API has a list of all modified files in the PR
      expect(HTTPoison, :get, fn "https://api.bitbucket.org/2.0/diffstat_url", _ ->
        {:ok, %HTTPoison.Response{
          status_code: 200,
          body: Jason.encode!(%{
            "values" => [%{
              "new" => %{
                "escaped_path" => "terraform/main.tf",
                "links" => %{"self" => %{"href" => "https://api.bitbucket.org/2.0/raw_url"}}
              }
            }]
          })
        }}
      end)

      # Mock the call to get the full file contents
      expect(HTTPoison, :get, fn "https://api.bitbucket.org/2.0/raw_url", _ ->
        {:ok, %HTTPoison.Response{
          status_code: 200,
          body: "terraform content"
        }}
      end)

      event = %PubSub.PullRequestCreated{item: pr}
      Consumer.handle_event(event)
      ES.refresh(ES.vector_index())

      {:ok, c} = ES.count_index(ES.vector_index())
      assert c > 0

      settings = Console.Deployments.Settings.fetch_consistent()
      assert settings.ai.vector_store.initialized
    end
  end

  describe "Fetch PR files" do
    @tag opensearch: true
    test "it can fetch pr files from github (opensearch)" do
      deployment_settings(ai: %{
        enabled: true,
        vector_store: %{
          enabled: true,
          store: :opensearch,
          opensearch: OS.os_vector_settings(),
        },
        provider: :openai,
        openai: %{access_token: "key"}
      })
      OS.drop_index(OS.vector_index())

      insert(:scm_connection, default: true, type: :github)
      flow = insert(:flow)
      pr = insert(:pull_request, flow: flow, status: :merged, url: "https://github.com/owner/repo/pull/1")

      # Mock embedding twice, once for indexing and once for fetching
      expect(Console.AI.OpenAI, :embeddings, 2, fn _, text -> {:ok, [{text, OS.vector()}]} end)

      # Mock calls to get PR info and files
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

      # Mock OS vector index (since we can't set up a local opensearch instance the way we do for elasticsearch)
      expect(OS, :index, fn _, _, _ -> {:ok, %{status: 200}} end)

      event = %PubSub.PullRequestCreated{item: pr}
      Consumer.handle_event(event)
      OS.refresh(OS.vector_index())

      {:ok, c} = OS.count_index(OS.vector_index())
      assert c > 0

      settings = Console.Deployments.Settings.fetch_consistent()
      assert settings.ai.vector_store.initialized

      assert {:ok, [%Console.AI.VectorStore.Response{
        type: :pr,
        pr_file: %{filename: "terraform/main.tf"}
      }]} = Console.AI.VectorStore.fetch("terraform", [])
    end

    @tag opensearch: true
    test "it can fetch pr files from github (elastic)" do
      deployment_settings(ai: %{
        enabled: true,
        vector_store: %{
          enabled: true,
          store: :elastic,
          elastic: ES.es_vector_settings(),
        },
        provider: :openai,
        openai: %{access_token: "key"}
      })
      ES.drop_index(ES.vector_index())

      insert(:scm_connection, default: true, type: :github)
      flow = insert(:flow)
      pr = insert(:pull_request, flow: flow, status: :merged, url: "https://github.com/owner/repo/pull/1")

      # Mock twice, once for indexing and once for fetching
      expect(Console.AI.OpenAI, :embeddings, 2, fn _, text -> {:ok, [{text, ES.vector()}]} end)
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
      ES.refresh(ES.vector_index())

      {:ok, c} = ES.count_index(ES.vector_index())
      assert c > 0

      settings = Console.Deployments.Settings.fetch_consistent()
      assert settings.ai.vector_store.initialized

      assert {:ok, [%Console.AI.VectorStore.Response{
        type: :pr,
        pr_file: %{filename: "terraform/main.tf"}
      }]} = Console.AI.VectorStore.fetch("terraform", [])
    end
  end

  describe "AlertResolutionCreated" do
    test "it can vector index alerts" do
      deployment_settings(ai: %{
        enabled: true,
        vector_store: %{
          enabled: true,
          store: :elastic,
          elastic: ES.es_vector_settings(),
        },
        provider: :openai,
        openai: %{access_token: "key"}
      })
      ES.drop_index(ES.vector_index())

      alert = insert(:alert)
      resolution = insert(:alert_resolution, alert: alert)

      expect(Console.AI.OpenAI, :embeddings, fn _, text -> {:ok, [{text, ES.vector()}]} end)

      event = %PubSub.AlertResolutionCreated{item: resolution}
      Consumer.handle_event(event)
      ES.refresh(ES.vector_index())

      {:ok, c} = ES.count_index(ES.vector_index())
      assert c > 0
    end
  end
end
