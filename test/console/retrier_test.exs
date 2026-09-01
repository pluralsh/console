defmodule Console.RetrierTest do
  use ExUnit.Case, async: true

  alias Console.Retrier

  test "retries only results accepted by retry_if" do
    Process.put(:attempts, 0)

    assert {:error, :not_found} =
             Retrier.retry(
               fn ->
                 Process.put(:attempts, Process.get(:attempts) + 1)
                 {:error, :not_found}
               end,
               max: 6,
               pause: 0,
               retry_if: &match?({:error, :rate_limited}, &1)
             )

    assert Process.get(:attempts) == 1
  end

  test "max permits the configured number of attempts" do
    Process.put(:attempts, 0)

    assert {:error, :rate_limited} =
             Retrier.retry(
               fn ->
                 Process.put(:attempts, Process.get(:attempts) + 1)
                 {:error, :rate_limited}
               end,
               max: 6,
               pause: 0,
               retry_if: &match?({:error, :rate_limited}, &1)
             )

    assert Process.get(:attempts) == 6
  end
end
