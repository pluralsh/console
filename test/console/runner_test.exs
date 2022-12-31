defmodule Console.RunnerTest do
  use Console.DataCase, async: false
  use Mimic
  import Console.TestHelpers

  setup :set_mimic_global

  describe "#start/3" do
    test "it can execute a sequence of operations and mark a build as successful" do
      build = insert(:build)

      expect(Console.Storage.Git, :revision, fn -> {:ok, "1234"} end)

      {:ok, pid} = Console.Runner.start(build, [
        {__MODULE__, :echo, [self(), "first"]},
        {__MODULE__, :echo, [self(), "second"]},
      ], Console.Storage.Git)

      ref = Process.monitor(pid)

      assert_receive {:hey, "first"}
      assert_receive {:hey, "second"}

      assert_receive {:DOWN, ^ref, :process, _, _}

      assert refetch(build).status == :successful
    end

    test "if a build requires approval, it needs to be manually kicked" do
      build = insert(:build)

      expect(Console.Storage.Git, :revision, fn -> {:ok, "1234"} end)

      {:ok, pid} = Console.Runner.start(build, [
        {__MODULE__, :echo, [self(), "first"]},
        :approval,
        {__MODULE__, :echo, [self(), "second"]},
      ], Console.Storage.Git)

      ref = Process.monitor(pid)

      assert_receive {:hey, "first"}

      :timer.sleep(500)
      assert refetch(build).status == :pending

      send pid, :kick

      assert_receive {:hey, "second"}

      assert_receive {:DOWN, ^ref, :process, _, _}

      assert refetch(build).status == :successful
    end
  end

  def echo(pid, arg), do: {:ok, send(pid, {:hey, arg})}
end
