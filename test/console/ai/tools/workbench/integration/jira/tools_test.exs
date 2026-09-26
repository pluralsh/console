defmodule Console.AI.Tools.Workbench.Integration.Jira.ToolsTest do
  use Console.DataCase, async: false
  use Mimic

  alias Console.AI.Tool
  alias Console.AI.Workbench.Tools, as: WorkbenchTools
  alias Console.AI.Workbench.MCP.Toolset.Classify
  alias Console.AI.Tools.Workbench.Integration.Jira.{
    GetIssue,
    ListComments,
    ListIssues,
    ListTransitions,
    SaveComment,
    SaveIssue,
    Tools,
    TransitionIssue
  }

  alias Console.Schema.WorkbenchTool

  test "expands the same non-destructive toolset for Cloud and Data Center" do
    for type <- [:jira, :jira_datacenter] do
      names =
        type
        |> workbench_tool()
        |> Tools.expand()
        |> Enum.map(&Tool.name/1)

      assert Enum.sort(names) ==
               Enum.sort([
                 "jira_#{type}_get_issue",
                 "jira_#{type}_list_comments",
                 "jira_#{type}_list_issues",
                 "jira_#{type}_list_transitions",
                 "jira_#{type}_save_comment",
                 "jira_#{type}_save_issue",
                 "jira_#{type}_transition_issue"
               ])

      refute Enum.any?(names, &String.contains?(&1, "delete"))
    end
  end

  test "registers with integration tools and classifies only reads as read-only" do
    [
      list_issues,
      get_issue,
      save_issue,
      list_comments,
      save_comment,
      list_transitions,
      transition_issue
    ] =
      WorkbenchTools.integration_tools([workbench_tool(:jira)])

    assert %ListIssues{} = list_issues
    assert %GetIssue{} = get_issue
    assert %SaveIssue{} = save_issue
    assert %ListComments{} = list_comments
    assert %SaveComment{} = save_comment
    assert %ListTransitions{} = list_transitions
    assert %TransitionIssue{} = transition_issue

    assert Classify.readonly?(list_issues)
    assert Classify.readonly?(get_issue)
    assert Classify.readonly?(list_comments)
    assert Classify.readonly?(list_transitions)
    refute Classify.readonly?(save_issue)
    refute Classify.readonly?(save_comment)
    refute Classify.readonly?(transition_issue)
  end

  test "save_issue requires create fields but permits partial updates" do
    instance = %SaveIssue{tool: workbench_tool(:jira)}

    assert {:error, changeset} =
             instance
             |> SaveIssue.changeset(%{"summary" => "Missing project and type"})
             |> Ecto.Changeset.apply_action(:update)

    assert %{project: ["can't be blank"], issue_type: ["can't be blank"]} =
             errors_on(changeset)

    assert {:ok, %SaveIssue{issue_id: "ENG-123", summary: "Updated"}} =
             instance
             |> SaveIssue.changeset(%{"issue_id" => "ENG-123", "summary" => "Updated"})
             |> Ecto.Changeset.apply_action(:update)
  end

  test "save_issue creates a Data Center issue with the documented v2 shape" do
    expect(Req, :request, fn opts ->
      assert opts[:method] == :post
      assert opts[:url] == "https://jira.example.com/rest/api/2/issue"

      assert Jason.decode!(opts[:body]) == %{
               "fields" => %{
                 "description" => "Details",
                 "issuetype" => %{"name" => "Bug"},
                 "labels" => ["agent"],
                 "project" => %{"key" => "ENG"},
                 "summary" => "Broken"
               }
             }

      {:ok, %Req.Response{status: 201, body: ~s({"id":"10001","key":"ENG-1"})}}
    end)

    assert {:ok, model} =
             %SaveIssue{tool: workbench_tool(:jira_datacenter)}
             |> SaveIssue.changeset(%{
               "project" => "ENG",
               "issue_type" => "Bug",
               "summary" => "Broken",
               "description" => "Details",
               "fields" => %{"labels" => ["agent"]}
             })
             |> Ecto.Changeset.apply_action(:update)

    assert {:ok, encoded} = SaveIssue.implement(model)
    assert %{"key" => "ENG-1"} = Jason.decode!(encoded)
  end

  test "save_issue updates a Data Center issue with a fields object" do
    expect(Req, :request, fn opts ->
      assert opts[:method] == :put
      assert opts[:url] == "https://jira.example.com/rest/api/2/issue/ENG-1"

      assert Jason.decode!(opts[:body]) == %{
               "fields" => %{
                 "labels" => ["agent", "updated"],
                 "summary" => "Updated summary"
               }
             }

      {:ok, %Req.Response{status: 204, body: ""}}
    end)

    assert {:ok, model} =
             %SaveIssue{tool: workbench_tool(:jira_datacenter)}
             |> SaveIssue.changeset(%{
               "issue_id" => "ENG-1",
               "summary" => "Updated summary",
               "fields" => %{"labels" => ["agent", "updated"]}
             })
             |> Ecto.Changeset.apply_action(:update)

    assert {:ok, encoded} = SaveIssue.implement(model)
    assert %{"issueId" => "ENG-1", "updated" => true} = Jason.decode!(encoded)
  end

  test "save_comment updates an existing Data Center comment" do
    expect(Req, :request, fn opts ->
      assert opts[:method] == :put
      assert opts[:url] ==
               "https://jira.example.com/rest/api/2/issue/ENG-1/comment/42"

      assert Jason.decode!(opts[:body]) == %{"body" => "Updated comment"}
      {:ok, %Req.Response{status: 200, body: ~s({"id":"42"})}}
    end)

    assert {:ok, model} =
             %SaveComment{tool: workbench_tool(:jira_datacenter)}
             |> SaveComment.changeset(%{
               "issue_id" => "ENG-1",
               "comment_id" => "42",
               "body" => "Updated comment"
             })
             |> Ecto.Changeset.apply_action(:update)

    assert {:ok, encoded} = SaveComment.implement(model)
    assert %{"id" => "42"} = Jason.decode!(encoded)
  end

  test "list_transitions gets available Cloud transitions with filters" do
    expect(Req, :request, fn opts ->
      assert opts[:method] == :get

      assert opts[:url] ==
               "https://example.atlassian.net/rest/api/2/issue/ENG-1/transitions" <>
                 "?expand=transitions.fields&transitionId=21"

      {:ok,
       %Req.Response{
         status: 200,
         body: ~s({"transitions":[{"id":"21","name":"In Progress"}]})
       }}
    end)

    assert {:ok, model} =
             %ListTransitions{tool: workbench_tool(:jira)}
             |> ListTransitions.changeset(%{
               "issue_id" => "ENG-1",
               "transition_id" => "21",
               "expand" => ["transitions.fields"]
             })
             |> Ecto.Changeset.apply_action(:update)

    assert {:ok, encoded} = ListTransitions.implement(model)
    assert %{"transitions" => [%{"id" => "21"}]} = Jason.decode!(encoded)
  end

  test "transition_issue posts a Data Center transition with fields and updates" do
    expect(Req, :request, fn opts ->
      assert opts[:method] == :post
      assert opts[:url] == "https://jira.example.com/rest/api/2/issue/ENG-1/transitions"

      assert Jason.decode!(opts[:body]) == %{
               "transition" => %{"id" => "21"},
               "fields" => %{"resolution" => %{"name" => "Done"}},
               "update" => %{"comment" => [%{"add" => %{"body" => "Completed"}}]}
             }

      {:ok, %Req.Response{status: 204, body: ""}}
    end)

    assert {:ok, model} =
             %TransitionIssue{tool: workbench_tool(:jira_datacenter)}
             |> TransitionIssue.changeset(%{
               "issue_id" => "ENG-1",
               "transition_id" => "21",
               "fields" => %{"resolution" => %{"name" => "Done"}},
               "update" => %{"comment" => [%{"add" => %{"body" => "Completed"}}]}
             })
             |> Ecto.Changeset.apply_action(:update)

    assert {:ok, encoded} = TransitionIssue.implement(model)

    assert %{
             "issueId" => "ENG-1",
             "transitionId" => "21",
             "transitioned" => true
           } = Jason.decode!(encoded)
  end

  test "transition_issue requires an issue and transition ID" do
    assert {:error, changeset} =
             %TransitionIssue{tool: workbench_tool(:jira)}
             |> TransitionIssue.changeset(%{})
             |> Ecto.Changeset.apply_action(:update)

    assert %{issue_id: ["can't be blank"], transition_id: ["can't be blank"]} =
             errors_on(changeset)
  end

  defp workbench_tool(:jira) do
    tool(:jira, %{
      jira: %{
        url: "https://example.atlassian.net",
        email: "jira@example.com",
        api_token: "cloud-token"
      }
    })
  end

  defp workbench_tool(:jira_datacenter) do
    tool(:jira_datacenter, %{
      jira_datacenter: %{
        url: "https://jira.example.com",
        api_token: "dc-token"
      }
    })
  end

  defp tool(type, configuration) do
    %WorkbenchTool{}
    |> WorkbenchTool.changeset(%{
      tool: type,
      name: Atom.to_string(type),
      configuration: configuration
    })
    |> Ecto.Changeset.apply_changes()
  end
end
