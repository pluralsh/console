defmodule Console.AI.Tools.Workbench.Integration.ServiceNow.ClientTest do
  use Console.DataCase, async: false
  use Mimic

  alias Console.AI.Tools.Workbench.Integration.ServiceNow.Client
  alias Console.Schema.WorkbenchTool

  @sys_id "0123456789abcdef0123456789abcdef"

  describe "build/1" do
    test "builds Basic authentication and strips API suffixes from the instance URL" do
      assert {:ok, client} =
               Client.build(
                 tool(%{
                   service_now: %{
                     url: "https://example.service-now.com/api/now/",
                     username: "agent",
                     password: "secret"
                   }
                 })
               )

      assert client.base_url == "https://example.service-now.com/api/now"
      assert client.instance_url == "https://example.service-now.com"

      expected = Base.encode64("agent:secret")
      assert {"Authorization", "Basic #{expected}"} in client.headers
    end

    test "builds Bearer authentication from a cached OAuth token" do
      stub(Console.Cache, :get, fn _ ->
        %OAuth2.AccessToken{
          access_token: "oauth-token",
          expires_at: nil,
          refresh_token: nil,
          token_type: "Bearer",
          other_params: %{}
        }
      end)

      changeset =
        %WorkbenchTool{}
        |> WorkbenchTool.changeset(%{
          tool: :service_now,
          name: "snow",
          oauth: %{
            token_url: "https://example.service-now.com/oauth_token.do",
            client_id: "snow-client",
            client_secret: "client-secret"
          },
          configuration: %{service_now: %{url: "https://example.service-now.com"}}
        })

      assert changeset.valid?
      assert {:ok, client} = Client.build(Ecto.Changeset.apply_changes(changeset))
      assert {"Authorization", "Bearer oauth-token"} in client.headers
    end

    test "rejects a tool without credentials or OAuth" do
      changeset =
        %WorkbenchTool{}
        |> WorkbenchTool.changeset(%{
          tool: :service_now,
          name: "snow",
          configuration: %{service_now: %{url: "https://example.service-now.com", username: "agent"}}
        })

      refute changeset.valid?
      assert %{configuration: [_]} = errors_on(changeset)
    end
  end

  describe "table_path/2" do
    test "only allows ticket tables" do
      assert {:ok, "/table/incident"} = Client.table_path("incident")
      assert {:ok, "/table/sc_task/#{@sys_id}"} = Client.table_path("sc_task", @sys_id)
      assert {:error, _} = Client.table_path("sys_user")
    end
  end

  describe "resolve_sys_id/3" do
    test "passes a sys_id through without a request" do
      reject(&Req.request/1)
      assert {:ok, @sys_id} = Client.resolve_sys_id(client(), "incident", @sys_id)
    end

    test "looks up a record number" do
      expect(Req, :request, fn opts ->
        assert opts[:url] =~ "https://example.service-now.com/api/now/table/incident?"
        assert opts[:url] =~ "sysparm_query=number%3DINC0010001"
        {:ok, %Req.Response{status: 200, body: ~s({"result":[{"sys_id":"#{@sys_id}"}]})}}
      end)

      assert {:ok, @sys_id} = Client.resolve_sys_id(client(), "incident", "INC0010001")
    end

    test "returns an error when the number is unknown" do
      expect(Req, :request, fn _ -> {:ok, %Req.Response{status: 200, body: ~s({"result":[]})}} end)
      assert {:error, msg} = Client.resolve_sys_id(client(), "incident", "INC404")
      assert msg =~ "not found"
    end

    test "rejects ids that could alter the encoded query" do
      reject(&Req.request/1)
      assert {:error, _} = Client.resolve_sys_id(client(), "incident", "INC1^ORactive=true")
    end
  end

  defp client do
    {:ok, client} =
      Client.build(
        tool(%{
          service_now: %{url: "https://example.service-now.com", username: "agent", password: "secret"}
        })
      )

    client
  end

  defp tool(configuration) do
    %WorkbenchTool{}
    |> WorkbenchTool.changeset(%{tool: :service_now, name: "snow", configuration: configuration})
    |> Ecto.Changeset.apply_changes()
  end
end
