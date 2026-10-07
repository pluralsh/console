defmodule Console.ApplicationTest do
  use ExUnit.Case, async: true

  alias Console.Application

  test "does not supervise the cloud query client in test" do
    assert Application.cloud_query_client(:test, true) == []
  end

  test "uses the existing cloudquery feature setting by default" do
    refute Console.conf(:cloudquery)
    assert Application.cloud_query_client(:prod) == []
  end

  test "can disable the cloud query client outside test" do
    assert Application.cloud_query_client(:prod, false) == []
  end

  test "supervises the cloud query client when enabled outside test" do
    assert [{GRPC.Client.Connection, opts}] = Application.cloud_query_client(:prod, true)
    assert opts[:name] == CloudQuery.Client
    assert opts[:target] == Console.conf(:cloudquery_host)
    assert opts[:adapter] == CloudQuery.Client.adapter()
    assert opts[:interceptors] == CloudQuery.Client.interceptors()
  end
end
