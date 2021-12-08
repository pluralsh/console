defmodule ConsoleWeb.ShellChannelTest do
  use ConsoleWeb.ChannelCase, async: false
  use Mimic

  describe "ShellChannel" do
    test "users can connect to pods and send commands" do
      user = insert(:user)

      args = ["exec", "n", "-it", "-c", "c", "-n", "ns", "--", "/bin/sh"]
      expect(Porcelain, :spawn, fn "kubectl", ^args, _ ->
        %Porcelain.Process{}
      end)

      {:ok, socket} = mk_socket(user)
      {:ok, _, socket} = subscribe_and_join(socket, "pod:ns:n:c", %{})

      expect(Porcelain.Process, :send_input, fn _, "echo 'hello world'" ->
        send socket.channel_pid, {self(), :data, :out, "blah"}
        "blah"
      end)

      ref = push(socket, "command", %{"cmd" => "echo 'hello world'"})
      assert_reply ref, :ok, result

      assert result.stdout == "blah"

      assert_push "stdo", %{message: "blah"}
    end
  end
end
