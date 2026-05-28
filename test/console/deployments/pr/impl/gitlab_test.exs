defmodule Console.Deployments.Pr.Impl.GitlabTest do
  use Console.DataCase, async: true
  use Mimic

  alias Console.Deployments.Pr.Dispatcher
  alias Console.Deployments.Pr.Impl.Gitlab
  alias Console.Schema.{PrAutomation, ScmConnection}

  @nested_repo "https://gitlab.acme.corp/itsystems/kubernetes/plural-mgmt.git"
  @nested_project "itsystems/kubernetes/plural-mgmt"
  @nested_api_project "itsystems%2Fkubernetes%2Fplural-mgmt"
  @nested_mr "https://gitlab.acme.corp/itsystems/kubernetes/plural-mgmt/-/merge_requests/42"

  @simple_project "owner/repo"
  @simple_api_project "owner%2Frepo"
  @simple_mr "https://gitlab.com/owner/repo/-/merge_requests/1"

  describe "slug/1" do
    test "parses simple gitlab clone urls" do
      assert {:ok, "mygroup/myproject"} =
               Gitlab.slug("https://gitlab.com/mygroup/myproject.git")

      assert {:ok, "org/repo"} = Gitlab.slug("https://gitlab.com/org/repo")
      assert {:ok, @simple_project} = Gitlab.slug("https://gitlab.com/owner/repo.git")
    end

    test "parses nested gitlab group paths from clone urls" do
      assert {:ok, @nested_project} = Gitlab.slug(@nested_repo)

      assert {:ok, "org/subgroup/nested/project"} =
               Gitlab.slug("https://gitlab.com/org/subgroup/nested/project.git")
    end

    test "rejects clone urls without a project path" do
      assert {:error, "could not parse gitlab url"} = Gitlab.slug("https://gitlab.com")
      assert {:error, "could not parse gitlab url"} = Gitlab.slug("")
    end
  end

  describe "pr_info/1" do
    test "parses simple gitlab merge request urls" do
      assert {:ok, attrs} = Gitlab.pr_info(@simple_mr)

      assert attrs.project == @simple_project
      assert attrs.group == "owner"
      assert attrs.repo == "repo"
      assert attrs.number == "1"
    end

    test "parses nested gitlab merge request urls" do
      assert {:ok, attrs} = Gitlab.pr_info(@nested_mr)

      assert attrs.project == @nested_project
      assert attrs.group == "itsystems"
      assert attrs.repo == "plural-mgmt"
      assert attrs.number == "42"
    end
  end

  describe "create/3" do
    test "creates merge requests using the full nested project path" do
      conn = %ScmConnection{
        type: :gitlab,
        api_url: "https://gitlab.acme.corp",
        token: "token"
      }

      pr = %PrAutomation{
        ignore_templates: true,
        title: "Agent PR",
        message: "body",
        branch: "main",
        connection: conn,
        identifier: @nested_project
      }

      expect(HTTPoison, :post, fn url, body, headers ->
        assert url ==
                 "https://gitlab.acme.corp/api/v4/projects/#{@nested_api_project}/merge_requests"

        assert Jason.decode!(body) == %{
                 "allow_collaboration" => true,
                 "description" => "body",
                 "source_branch" => "feature/agent",
                 "target_branch" => "main",
                 "title" => "Agent PR"
               }

        assert {"PRIVATE-TOKEN", "token"} in headers

        {:ok,
         %HTTPoison.Response{
           status_code: 201,
           body:
             Jason.encode!(%{
               "web_url" => @nested_mr,
               "author" => %{"username" => "agent"}
             })
         }}
      end)

      assert {:ok, %{url: url, title: "Agent PR"}} =
               Gitlab.create(pr, "feature/agent", %{})

      assert url == @nested_mr
    end
  end

  describe "API URL formatting" do
    test "get_mr_info requests use encoded project paths for simple repos" do
      {:ok, gl_conn} = Gitlab.Connection.new("https://gitlab.com", "token")

      expect(HTTPoison, :get, fn url, _headers ->
        assert url ==
                 "https://gitlab.com/api/v4/projects/#{@simple_api_project}/merge_requests/1/changes"

        {:ok,
         %HTTPoison.Response{
           status_code: 200,
           body: Jason.encode!(%{"changes" => [], "sha" => "abc"})
         }}
      end)

      assert {:ok, %{"changes" => []}} = Gitlab.get_mr_info(gl_conn, @simple_project, "1")
    end

    test "files requests use encoded nested project paths" do
      conn = %ScmConnection{type: :gitlab, api_url: "https://gitlab.acme.corp", token: "token"}
      mr_url = @nested_mr

      expect(HTTPoison, :get, 2, fn url, _headers ->
        cond do
          String.contains?(url, "/merge_requests/42/changes") ->
            assert url ==
                     "https://gitlab.acme.corp/api/v4/projects/#{@nested_api_project}/merge_requests/42/changes"

            {:ok,
             %HTTPoison.Response{
               status_code: 200,
               body:
                 Jason.encode!(%{
                   "sha" => "abc123",
                   "title" => "Nested MR",
                   "target_branch" => "main",
                   "source_branch" => "feature",
                   "changes" => [
                     %{
                       "new_path" => "README.md",
                       "diff" => "patch"
                     }
                   ]
                 })
             }}

          String.contains?(url, "/repository/files/") ->
            assert url ==
                     "https://gitlab.acme.corp/api/v4/projects/#{@nested_api_project}/repository/files/README.md?ref=abc123"

            {:ok,
             %HTTPoison.Response{
               status_code: 200,
               body: Jason.encode!(%{"content" => Base.encode64("hello")})
             }}

          true ->
            flunk("unexpected gitlab api url: #{url}")
        end
      end)

      assert {:ok, [file]} = Gitlab.files(conn, mr_url)
      assert file.filename == "README.md"
      assert file.contents == Base.encode64("hello")
    end

    test "review requests use encoded nested project paths" do
      conn = %ScmConnection{type: :gitlab, api_url: "https://gitlab.acme.corp", token: "token"}
      pr = %Console.Schema.PullRequest{url: @nested_mr}

      expect(HTTPoison, :post, fn url, body, _headers ->
        assert url ==
                 "https://gitlab.acme.corp/api/v4/projects/#{@nested_api_project}/merge_requests/42/notes"

        assert Jason.decode!(body) == %{"body" => "looks good"}
        {:ok, %HTTPoison.Response{status_code: 201, body: Jason.encode!(%{"id" => 99})}}
      end)

      assert {:ok, "99"} = Gitlab.review(conn, pr, "looks good")
    end

    test "create tolerates scm api_url values that already include /api/v4" do
      conn = %ScmConnection{
        type: :gitlab,
        api_url: "https://gitlab.acme.corp/api/v4",
        token: "token"
      }

      pr = %PrAutomation{
        ignore_templates: true,
        title: "Agent PR",
        message: "body",
        branch: "main",
        connection: conn,
        identifier: @nested_project
      }

      expect(HTTPoison, :post, fn url, _body, _headers ->
        assert url ==
                 "https://gitlab.acme.corp/api/v4/projects/#{@nested_api_project}/merge_requests"

        {:ok,
         %HTTPoison.Response{
           status_code: 201,
           body:
             Jason.encode!(%{
               "web_url" => @nested_mr,
               "author" => %{"username" => "agent"}
             })
         }}
      end)

      assert {:ok, %{url: url}} = Gitlab.create(pr, "feature/agent", %{})
      assert url == @nested_mr
    end
  end

  describe "Dispatcher.pr/6" do
    test "derives nested gitlab project slug before creating merge requests" do
      conn = %ScmConnection{
        type: :gitlab,
        api_url: "https://gitlab.acme.corp",
        token: "token"
      }

      expect(HTTPoison, :post, fn url, _body, _headers ->
        assert url ==
                 "https://gitlab.acme.corp/api/v4/projects/#{@nested_api_project}/merge_requests"

        {:ok,
         %HTTPoison.Response{
           status_code: 201,
           body:
             Jason.encode!(%{
               "web_url" => @nested_mr,
               "author" => %{"username" => "agent"}
             })
         }}
      end)

      assert {:ok, %{url: url}} =
               Dispatcher.pr(conn, "Agent PR", "body", @nested_repo, "main", "feature/agent")

      assert url == @nested_mr
    end
  end
end
