defmodule Console.Deployments.Pr.Impl.BitBucketDatacenterTest do
  use Console.DataCase, async: true
  use Mimic

  alias Console.Deployments.Pr.Impl.BitBucketDatacenter
  alias Console.Deployments.Pr.Review
  alias Console.Schema.{PullRequest, ScmConnection}

  describe "pr/1" do
    test "parses Bitbucket Data Center pullRequest payloads" do
      payload = %{
        "eventKey" => "pr:opened",
        "pullRequest" => %{
          "id" => 42,
          "title" => "Add deployment retries",
          "description" => "Plural Flow: deploy-flow",
          "state" => "OPEN",
          "fromRef" => %{"displayId" => "feature/retries"},
          "toRef" => %{"displayId" => "main"},
          "links" => %{
            "self" => [
              %{"href" => "https://bitbucket.example.com/projects/PROJ/repos/repo/pull-requests/42"}
            ]
          }
        }
      }

      assert {:ok, url, attrs} = BitBucketDatacenter.pr(payload)
      assert url == "https://bitbucket.example.com/projects/PROJ/repos/repo/pull-requests/42"
      assert attrs.status == :open
      assert attrs.ref == "feature/retries"
      assert attrs.base == "main"
      assert attrs.title == "Add deployment retries"
      assert attrs.body == "Plural Flow: deploy-flow"
    end

    test "maps merged state from Data Center payloads" do
      payload = %{
        "eventKey" => "pr:merged",
        "pullRequest" => %{
          "title" => "Merge PR",
          "description" => "done",
          "state" => "MERGED",
          "fromRef" => %{"displayId" => "feature/retries"},
          "toRef" => %{"displayId" => "main"},
          "links" => %{
            "self" => [
              %{"href" => "https://bitbucket.example.com/projects/PROJ/repos/repo/pull-requests/43"}
            ]
          }
        }
      }

      assert {:ok, _url, attrs} = BitBucketDatacenter.pr(payload)
      assert attrs.status == :merged
    end
  end

  describe "agent_review/3" do
    test "uses the documented effective-diff anchor" do
      connection = %ScmConnection{
        type: :bitbucket_datacenter,
        api_url: "https://bitbucket.example.com",
        username: "user",
        token: "token"
      }

      url = "https://bitbucket.example.com/projects/PROJ/repos/repo/pull-requests/42"
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

      expect(Req, :post, 2, fn _, opts ->
        body = Jason.decode!(opts[:body])

        case body["anchor"] do
          nil ->
            response(%{"id" => 10})

          anchor ->
            assert anchor == %{
                     "diffType" => "EFFECTIVE",
                     "fileType" => "TO",
                     "line" => 12,
                     "lineType" => "ADDED",
                     "path" => "lib/example.ex"
                   }

            response(%{"id" => 11})
        end
      end)

      assert {:ok, "10"} = BitBucketDatacenter.agent_review(connection, pr, review)
    end
  end

  defp response(body) do
    {:ok, %Req.Response{status: 201, body: Jason.encode!(body)}}
  end
end
