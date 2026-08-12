defmodule Console.Kubernetes.PodExecTest do
  use ExUnit.Case, async: true

  alias Console.Kubernetes.PodExec

  describe "exec_url/4" do
    test "encodes each unquoted command word as a repeated command parameter" do
      url = PodExec.exec_url("default", "api-0", "api", command: "echo hello")

      assert command_args(url) == ["echo", "hello"]
      assert query_pairs(url) == [
        {"container", "api"},
        {"command", "echo"},
        {"command", "hello"},
        {"tty", "true"},
        {"stdin", "true"},
        {"stdout", "true"},
        {"stderr", "true"}
      ]
    end

    test "preserves quoted and escaped arguments as single command parameters" do
      url =
        PodExec.exec_url("default", "api-0", "api",
          command: ~s(echo "hello world" 'from pod' file\\ name)
        )

      assert command_args(url) == ["echo", "hello world", "from pod", "file name"]
    end

    test "percent-encodes reserved characters without collapsing command parameters" do
      url =
        PodExec.exec_url("team-a", "api-0", "api",
          command: ~s(printf '%s\\n' 'a&b=c')
        )

      assert command_args(url) == ["printf", "%s\\n", "a&b=c"]
      assert URI.parse(url).query =~ "command=a%26b%3Dc"
    end

    test "passes shell operators as literal arguments" do
      url = PodExec.exec_url("default", "api-0", "api", command: "echo hello | wc -c")

      assert command_args(url) == ["echo", "hello", "|", "wc", "-c"]
    end

    test "uses the default shell when no command is given" do
      url = PodExec.exec_url("default", "api-0", "api")

      assert command_args(url) == ["/bin/sh"]
    end

    test "disables stdin for non-interactive commands" do
      url = PodExec.exec_url("default", "api-0", "api", command: "echo hello", stdin: false)

      assert {"stdin", "false"} in query_pairs(url)
    end
  end

  describe "handle_frame/2" do
    test "delivers the Kubernetes exit status separately from command output" do
      status = ~s({"status":"Success"})

      assert {:ok, %PodExec.State{}} =
               PodExec.handle_frame({:binary, <<3>> <> status}, %PodExec.State{pid: self()})

      assert_receive {:exec_status, ^status}
      refute_receive {:stdo, _}
    end

    test "does not treat a v5 stream-close control frame as command completion" do
      assert {:ok, %PodExec.State{}} =
               PodExec.handle_frame({:binary, <<255, 0>>}, %PodExec.State{pid: self()})

      refute_receive _
    end
  end

  defp command_args(url) do
    query_pairs(url)
    |> Enum.flat_map(fn
      {"command", argument} -> [argument]
      _ -> []
    end)
  end

  defp query_pairs(url) do
    url
    |> URI.parse()
    |> Map.fetch!(:query)
    |> String.split("&")
    |> Enum.map(&(URI.decode_query(&1) |> Map.to_list() |> List.first()))
  end
end
