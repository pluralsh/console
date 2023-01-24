defmodule Console.Commands.CommandTest do
  use Console.DataCase, async: true
  alias Console.Commands.Command

  describe "cmd/2" do
    test "It can perform build command bookkeeping" do
      build = insert(:build)
      Command.set_build(build)

      {:ok, command} = Command.cmd("echo", ["hello world"], System.user_home!())

      assert command.build_id == build.id
      assert command.exit_code == 0
      assert command.stdout == "hello world\n"
      assert command.completed_at
    end
  end

  describe "Collectible" do
    test "commands implement the collectible protocol and caches the contents" do
      command = insert(:command)
      command = Enum.into(["one", "two", "three", "four\n"], command)

      assert command.stdout == "onetwothreefour\n"
      assert refetch(command).stdout == "onetwothreefour\n"
      assert Console.Services.Builds.get_line(%{command | stdout: nil}) == "onetwothreefour\n"
    end
  end
end
