defmodule Console.Deployments.Pr.Impl.BitBucketDatacenterTest do
  use Console.DataCase, async: true

  alias Console.Deployments.Pr.Impl.BitBucketDatacenter

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
end
