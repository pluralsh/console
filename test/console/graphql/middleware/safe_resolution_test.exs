defmodule Console.Middleware.SafeResolutionTest do
  use ExUnit.Case, async: true

  alias Absinthe.Resolution
  alias Console.Middleware.{SafeResolution, ErrorHandler}

  defp resolve(fun), do: SafeResolution.call(%Resolution{state: :unresolved}, fn _, _, _ -> fun.() end)

  describe "call/2" do
    @describetag :capture_log

    test "it converts raised exceptions into errors" do
      %Resolution{errors: [msg]} = resolve(fn -> raise Kazan.RemoteError, reason: {:http_error, 404, %{"message" => "not found"}} end)
      assert msg == "not found"
    end

    test "upstream failures and timeouts aren't logged as errors" do
      log = ExUnit.CaptureLog.capture_log(fn ->
        resolve(fn -> raise Kazan.RemoteError, reason: {:http_error, 503, %{"message" => "kas unavailable"}} end)
        resolve(fn -> raise HTTPoison.Error, reason: :timeout end)
        resolve(fn -> exit({:timeout, {GenServer, :call, []}}) end)
      end)

      refute log =~ "[error]"
    end

    test "unexpected failures are still logged as errors" do
      log = ExUnit.CaptureLog.capture_log(fn -> resolve(fn -> exit(:boom) end) end)
      assert log =~ "[error]"
    end

    test "it converts exits into errors" do
      %Resolution{errors: ["request timed out"]} = resolve(fn -> exit({:timeout, {GenServer, :call, []}}) end)
      %Resolution{errors: [_]} = resolve(fn -> exit(:boom) end)
    end

    test "it converts throws into errors" do
      %Resolution{errors: [_]} = resolve(fn -> throw(:oops) end)
    end
  end

  describe "wrap/2" do
    @resolver {{Resolution, :call}, &__MODULE__.noop/3}

    def noop(_, _, _), do: {:ok, nil}

    test "it hardens nested fields with resolvers" do
      assert SafeResolution.wrap([@resolver], %{identifier: :deployment}) ==
        [{SafeResolution, &__MODULE__.noop/3}, ErrorHandler]
    end

    test "it doesn't duplicate an existing error handler" do
      assert SafeResolution.wrap([@resolver, {ErrorHandler, []}], %{identifier: :deployment}) ==
        [{SafeResolution, &__MODULE__.noop/3}, {ErrorHandler, []}]
    end

    test "it preserves surrounding middleware order" do
      assert SafeResolution.wrap([Before, @resolver, After], %{identifier: :deployment}) ==
        [Before, {SafeResolution, &__MODULE__.noop/3}, After, ErrorHandler]
    end

    test "it leaves default field lookups alone" do
      map_get = [{Absinthe.Middleware.MapGet, :name}]
      assert SafeResolution.wrap(map_get, %{identifier: :deployment}) == map_get
    end

    test "nested resolver fields in the real schema get exactly one error handler" do
      %{fields: %{pods: %{middleware: middleware}}} = Absinthe.Schema.lookup_type(Console.GraphQl, :job)
      expanded = Absinthe.Middleware.unshim(middleware, Console.GraphQl)

      assert Enum.any?(expanded, &match?({SafeResolution, _}, &1))
      assert List.last(expanded) == ErrorHandler
      assert Enum.count(expanded, &(&1 == ErrorHandler)) == 1
    end

    test "introspection still works with nested hardening" do
      {:ok, %{data: %{"__type" => %{"name" => "Deployment"}}}} =
        Absinthe.run(~s<{ __type(name: "Deployment") { name fields { name } } }>, Console.GraphQl)
    end
  end
end
