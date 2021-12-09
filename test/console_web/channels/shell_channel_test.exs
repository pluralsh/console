defmodule ConsoleWeb.ShellChannelTest do
  use ConsoleWeb.ChannelCase, async: false
  use Mimic
  alias Console.Kubernetes.PodExec

  setup :set_mimic_global

  describe "ShellChannel" do
    test "users can connect to pods and send commands" do
      user = insert(:user)
      role = insert(:role, repositories: ["*"], permissions: %{operate: true})
      insert(:role_binding, role: role, user: user)

      url = PodExec.exec_url("ns", "n", "c")

      expect(PodExec, :start_link, fn ^url, _ -> {:ok, :pid} end)

      expect(PodExec, :command, fn :pid, cmd ->
        send self(), {:stdo, cmd}
      end)

      {:ok, socket} = mk_socket(user)
      {:ok, _, socket} = subscribe_and_join(socket, "pod:ns:n:c", %{})

      ref = push(socket, "command", %{"cmd" => "echo 'hello world'"})
      assert_reply ref, :ok, _
      assert_push "stdo", %{message: "echo 'hello world'"}
    end

    @tag :skip
    test "those without access cannot shell into pods" do
      user = insert(:user)

      pid = spawn fn ->
        :timer.sleep(1000)
        {:ok, socket} = mk_socket(user)
        {:ok, _, _} = subscribe_and_join(socket, "pod:ns:n:c", %{})
      end
      Process.monitor(pid)
      assert_receive {:DOWN, _, _, _, {:shutdown, :failed_exec}}, 2000
    end
  end
end
