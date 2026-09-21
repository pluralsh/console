defmodule Console.AI.Tools.Workbench.Integration.Jira.ClientTest do
  use Console.DataCase, async: true
  use Mimic

  alias Console.AI.Tools.Workbench.Integration.Jira.Client
  alias Console.Schema.WorkbenchTool

  describe "build/1" do
    test "builds Jira Cloud Basic authentication" do
      assert {:ok, client} =
               Client.build(
                 tool(:jira, %{
                   jira: %{
                     url: "https://example.atlassian.net/",
                     email: "jira@example.com",
                     api_token: "cloud-token"
                   }
                 })
               )

      assert client.base_url == "https://example.atlassian.net/rest/api/2"
      assert client.deployment == :cloud

      expected = Base.encode64("jira@example.com:cloud-token")
      assert {"Authorization", "Basic #{expected}"} in client.headers
    end

    test "builds Jira Data Center Bearer authentication" do
      assert {:ok, client} =
               Client.build(
                 tool(:jira_datacenter, %{
                   jira_datacenter: %{
                     url: "https://jira.example.com/",
                     api_token: "dc-token"
                   }
                 })
               )

      assert client.base_url == "https://jira.example.com/rest/api/latest"
      assert client.deployment == :datacenter
      assert {"Authorization", "Bearer dc-token"} in client.headers
    end
  end

  describe "search/2" do
    test "uses enhanced search for Jira Cloud" do
      expect(Req, :request, fn opts ->
        assert opts[:url] =~ "/rest/api/2/search/jql?"
        assert opts[:url] =~ "nextPageToken=next"
        {:ok, %Req.Response{status: 200, body: ~s({"issues":[]})}}
      end)

      {:ok, client} =
        Client.build(
          tool(:jira, %{
            jira: %{
              url: "https://example.atlassian.net",
              email: "jira@example.com",
              api_token: "cloud-token"
            }
          })
        )

      assert {:ok, %{"issues" => []}} =
               Client.search(client, %{jql: "project = ENG", nextPageToken: "next"})
    end

    test "uses offset search for Jira Data Center" do
      expect(Req, :request, fn opts ->
        assert opts[:url] =~ "/rest/api/latest/search?"
        assert opts[:url] =~ "startAt=20"
        refute opts[:url] =~ "nextPageToken"
        {:ok, %Req.Response{status: 200, body: ~s({"issues":[]})}}
      end)

      {:ok, client} =
        Client.build(
          tool(:jira_datacenter, %{
            jira_datacenter: %{
              url: "https://jira.example.com",
              api_token: "dc-token"
            }
          })
        )

      assert {:ok, %{"issues" => []}} =
               Client.search(client, %{jql: "project = ENG", startAt: 20})
    end
  end

  defp tool(type, configuration) do
    %WorkbenchTool{}
    |> WorkbenchTool.changeset(%{
      tool: type,
      name: "jira",
      configuration: configuration
    })
    |> Ecto.Changeset.apply_changes()
  end
end
