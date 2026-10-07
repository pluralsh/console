defmodule Console.Deployments.Pr.Impl.BitBucketTest do
  use ExUnit.Case, async: true
  use Mimic

  alias Console.Deployments.Pr.Impl.BitBucket
  alias Console.Deployments.Pr.Review
  alias Console.Schema.{PullRequest, ScmConnection}

  test "uses the documented inline pull request comment payload" do
    connection = %ScmConnection{type: :bitbucket, token: "token"}
    url = "https://bitbucket.org/pluralsh/console/pull-requests/42"
    pr = %PullRequest{url: url}

    review =
      Review.new(%{
        url: url,
        confidence: :b,
        summary: "Safe refactor",
        confidence_comment: "One finding needs attention.",
        comments: [
          %{
            filename: "lib/example.ex",
            line: 12,
            title: "Unhandled error",
            body: "Handle this error.",
            priority: :p1
          }
        ]
      })

    expect(Req, :post, 2, fn url, opts ->
      assert String.ends_with?(url, "/repositories/pluralsh/console/pullrequests/42/comments")
      body = Jason.decode!(opts[:body])

      case body["inline"] do
        nil ->
          response(%{"id" => 10})

        inline ->
          assert inline == %{"path" => "lib/example.ex", "to" => 12}

          assert body["content"]["raw"] ==
                   ~s(<img src="#{Console.url("/review-priority-p1.svg")}" alt="P1" width="26" height="20" align="absmiddle"> **Unhandled error**\n\nHandle this error.)

          response(%{"id" => 11})
      end
    end)

    assert {:ok, "10"} = BitBucket.agent_review(connection, pr, review)
  end

  test "returns the source branch from pull request details" do
    connection = %ScmConnection{type: :bitbucket, token: "token"}

    expect(Req, :get, fn url, _opts ->
      assert url == "https://api.bitbucket.org/2.0/repositories/pluralsh/console/pullrequests/42"

      response(%{
        "title" => "Agent review support",
        "summary" => %{"raw" => "Adds normalized reviews."},
        "source" => %{
          "branch" => %{"name" => "feature/agent-review"},
          "commit" => %{"hash" => "head-sha"}
        }
      })
    end)

    assert {:ok,
            %{
              title: "Agent review support",
              body: "Adds normalized reviews.",
              commit_sha: "head-sha",
              ref: "feature/agent-review"
            }} =
             BitBucket.pr_details(connection, "https://bitbucket.org/pluralsh/console/pull-requests/42")
  end

  test "associates build status with the pull request source branch" do
    connection = %ScmConnection{type: :bitbucket, token: "token"}

    pr = %PullRequest{
      url: "https://bitbucket.org/pluralsh/console/pull-requests/42",
      ref: "feature/agent-review"
    }

    expect(Req, :post, fn url, opts ->
      assert url ==
               "https://api.bitbucket.org/2.0/repositories/pluralsh/console/commit/head-sha/statuses/build"

      assert Jason.decode!(opts[:body]) == %{
               "key" => "plural-agent-review",
               "state" => "INPROGRESS",
               "url" => "https://console.example.com/ai/agent-runs/run-id",
               "name" => "Plural: Agent review",
               "description" => "Plural agent review",
               "refname" => "feature/agent-review"
             }

      response(%{"key" => "plural-agent-review"})
    end)

    assert {:ok, "plural-agent-review"} =
             BitBucket.commit_status(connection, pr, nil, :running, %{
               sha: "head-sha",
               url: "https://console.example.com/ai/agent-runs/run-id",
               name: "Plural: Agent review",
               description: "Plural agent review"
             })
  end

  defp response(body) do
    {:ok, %Req.Response{status: 201, body: Jason.encode!(body)}}
  end
end
