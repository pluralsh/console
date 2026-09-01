defmodule Console.Deployments.Pr.Impl.AzureTest do
  use ExUnit.Case, async: true
  use Mimic

  alias Console.Deployments.Pr.Impl.Azure
  alias Console.Deployments.Pr.Review
  alias Console.Schema.{PullRequest, ScmConnection}

  test "creates inline threads with documented iteration context" do
    connection = %ScmConnection{
      type: :azure_devops,
      token: "token",
      azure: %ScmConnection.Azure{
        username: "user",
        organization: "org",
        project: "project"
      }
    }

    url = "https://dev.azure.com/org/project/_git/repo/pullrequest/42"
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

    expect(Req, :get, 4, fn url, _opts ->
      cond do
        String.contains?(url, "/git/repositories/repo?") ->
          response(%{"id" => "repo-id"})

        String.contains?(url, "/iterations/2/changes?$top=2000&api-version=") ->
          response(%{
            "changeEntries" => [
              %{
                "changeTrackingId" => 7,
                "item" => %{"path" => "/lib/example.ex"}
              }
            ]
          })

        String.contains?(url, "/iterations?") ->
          response(%{"value" => [%{"id" => 1}, %{"id" => 2}]})
      end
    end)

    expect(Req, :post, 2, fn _, opts ->
      body = Jason.decode!(opts[:body])

      case body["pullRequestThreadContext"] do
        nil ->
          response(%{"id" => 10, "comments" => [%{"id" => 1}]})

        context ->
          assert context == %{
                   "changeTrackingId" => 7,
                   "iterationContext" => %{
                     "firstComparingIteration" => 1,
                     "secondComparingIteration" => 2
                   }
                 }

          response(%{"id" => 11})
      end
    end)

    assert {:ok, "10:1"} = Azure.agent_review(connection, pr, review)
  end

  defp response(body) do
    {:ok, %Req.Response{status: 200, body: Jason.encode!(body)}}
  end
end
