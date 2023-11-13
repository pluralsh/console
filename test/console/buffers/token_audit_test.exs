defmodule Console.Buffers.TokenAuditTest do
  use Console.DataCase, async: false
  alias Console.Buffers.TokenAudit

  describe "Console.Buffers.TokenAudit" do
    test "it will collect token audits and aggregate conuts" do
      tok = insert(:access_token)
      now = Timex.now()
            |> Timex.set(minute: 0, second: 0, microsecond: {0, 6})
      ip = '1.2.3.4'

      {:ok, pid} = TokenAudit.start()
      Process.monitor(pid)
      TokenAudit.submit(pid, {tok.id, now, ip})
      TokenAudit.submit(pid, {tok.id, now, ip})
      send(pid, :flush)

      assert_receive {:DOWN, _, :process, ^pid, _}

      [audit] = Console.Repo.all(Console.Schema.AccessTokenAudit)

      assert audit.ip == "#{ip}"
      assert audit.token_id == tok.id
      assert audit.timestamp == now
      assert audit.count == 2
    end
  end
end
