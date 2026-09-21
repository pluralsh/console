defmodule Console.AI.Tools.Workbench.Integration.BitbucketDatacenter.ClientTest do
  use Console.DataCase, async: true
  use Mimic

  alias Console.AI.Tools.Workbench.Integration.BitbucketDatacenter.Client
  alias Console.Schema.{ScmConnection, WorkbenchTool}

  test "uses Basic authentication when a username is configured" do
    tool =
      %WorkbenchTool{}
      |> WorkbenchTool.changeset(%{
        tool: :bitbucket_datacenter,
        name: "bitbucket-dc",
        configuration: %{
          bitbucket_datacenter: %{
            url: "https://bitbucket.example.com",
            username: "user",
            token: "token"
          }
        }
      })
      |> Ecto.Changeset.apply_changes()

    expect(Req, :get, fn _, opts ->
      expected = Base.encode64("user:token")
      assert {"Authorization", "Basic #{expected}"} in opts[:headers]
      response()
    end)

    assert {:ok, client} = Client.build(tool)
    assert {:ok, %{}} = Client.get(client, "/projects")
  end

  test "uses Bearer authentication when no username is configured" do
    tool = %WorkbenchTool{
      scm_connection: %ScmConnection{
        type: :bitbucket_datacenter,
        base_url: "https://bitbucket.example.com",
        token: "token"
      }
    }

    expect(Req, :get, fn _, opts ->
      assert {"Authorization", "Bearer token"} in opts[:headers]
      response()
    end)

    assert {:ok, client} = Client.build(tool)
    assert {:ok, %{}} = Client.get(client, "/projects")
  end

  defp response do
    {:ok, %Req.Response{status: 200, body: "{}"}}
  end
end
