defmodule Console.PubSub.Fanout.AccessTokenTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.PubSub

  setup do
    Application.ensure_all_started(:swarm)
    :ok
  end

  describe "AccessTokenUsage" do
    test "it can post a message about the meeting" do
      token = insert(:access_token)
      ip = "0.0.0.0"
      expect(Console.Buffers.TokenAudit, :submit, fn _, job -> {:ok, job} end)

      ctx = %Console.Schema.AuditContext{ip: ip}
      event = %PubSub.AccessTokenUsage{item: token, context: ctx}
      {:ok, {id, ts, found_ip}} = PubSub.Recurse.process(event)

      assert token.id == id
      assert Timex.now()
             |> Timex.set(minute: 0, second: 0, microsecond: {0, 6})
             |> Timex.equal?(ts)
      assert ip == found_ip
    end
  end
end
