defmodule Console.AI.Stream.SSETest do
  use Console.DataCase, async: true
  alias Console.AI.Stream.SSE

  describe "#parse/1" do
    test "can handle a normal sse event set" do
      data = "event: blah\ndata: something\n\nevent: blah\ndata: else\n\n"

      {[first, second], ""} = SSE.parse(data)

      assert first.data == "something"
      assert second.data == "else"
    end

    test "it will parse json smoothly" do
      f = %{"some" => "result"}
      s = %{"other" => "result"}
      data = "event: blah\ndata: #{Jason.encode!(f)}\n\nevent: blah\ndata: #{Jason.encode!(s)}\n\n"

      {[first, second], ""} = SSE.parse(data)

      assert first.data == f
      assert second.data == s
    end

    test "it will handle stragglers" do
      f = %{"some" => "result"}
      s = %{"other" => "result"}
      data = "event: blah\ndata: #{Jason.encode!(f)}\n\nevent: blah\ndata: "
      next = "#{Jason.encode!(s)}\n\n"

      {[first], rest} = SSE.parse(data)
      {[second], ""} = SSE.parse(rest <> next)

      assert first.data == f
      assert second.data == s
    end
  end
end
