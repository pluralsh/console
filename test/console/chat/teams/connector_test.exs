defmodule Console.Chat.Teams.ConnectorTest do
  use Console.DataCase, async: true
  use Mimic

  alias Console.Chat.Teams.{Connector, Token}
  alias Console.Schema.WorkbenchTool.Configuration.TeamsConnection

  @service_url "https://smba.trafficmanager.net/amer/"
  @conversation_id "19:channel@thread.tacv2;messageid=root id"
  @encoded_conversation "19%3Achannel%40thread.tacv2%3Bmessageid%3Droot%20id"
  @activity_id "act/ivity+1"
  @encoded_activity "act%2Fivity%2B1"

  setup do
    stub(Token, :connector_token, fn "cid", "secret", "tid" -> {:ok, "connector-token"} end)
    :ok
  end

  defp connection() do
    %TeamsConnection{client_id: "cid", client_secret: "secret", tenant_id: "tid"}
  end

  defp capture_post() do
    parent = self()

    stub(Req, :post, fn url, opts ->
      send(parent, {:posted, url, opts})
      {:ok, %Req.Response{status: 201, body: %{"id" => "new-activity"}}}
    end)
  end

  describe "reply/5" do
    test "posts to the activity url so the reply stays in the original thread" do
      capture_post()

      assert {:ok, %{"id" => "new-activity"}} =
               Connector.reply(connection(), @service_url, "19:channel@thread.tacv2", "on it", "root-activity")

      assert_receive {:posted, url, opts}
      assert url == "https://smba.trafficmanager.net/amer/v3/conversations/19%3Achannel%40thread.tacv2/activities/root-activity"
      assert opts[:auth] == {:bearer, "connector-token"}
      assert opts[:json] == %{"type" => "message", "text" => "on it"}
    end

    test "encodes reserved characters in the conversation and activity ids" do
      capture_post()

      assert {:ok, _} =
               Connector.reply(connection(), @service_url, @conversation_id, "on it", @activity_id)

      assert_receive {:posted, url, _opts}
      assert url ==
               "https://smba.trafficmanager.net/amer/v3/conversations/#{@encoded_conversation}/activities/#{@encoded_activity}"
    end

    test "falls back to the conversation activities url when no activity id is given" do
      capture_post()

      assert {:ok, _} = Connector.reply(connection(), @service_url, @conversation_id, "on it")

      assert_receive {:posted, url, _opts}
      assert url == "https://smba.trafficmanager.net/amer/v3/conversations/#{@encoded_conversation}/activities"
    end

    test "falls back to the conversation activities url when the activity id is blank" do
      capture_post()

      assert {:ok, _} = Connector.reply(connection(), @service_url, @conversation_id, "on it", "")

      assert_receive {:posted, url, _opts}
      assert url == "https://smba.trafficmanager.net/amer/v3/conversations/#{@encoded_conversation}/activities"
    end
  end
end
