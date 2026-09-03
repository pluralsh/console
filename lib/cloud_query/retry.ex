defmodule CloudQuery.Client.Retry do
  @moduledoc false
  @behaviour GRPC.Client.Interceptor

  require Logger

  @unavailable 14

  @impl true
  def init(opts) do
    Keyword.merge([max: 3, pause: 400, backoff: 2], opts)
  end

  @impl true
  def call(%{grpc_type: :unary} = stream, req, next, opts) do
    Console.Retrier.retry(
      fn -> next.(stream, req) end,
      max: Keyword.fetch!(opts, :max),
      pause: Keyword.fetch!(opts, :pause),
      backoff: Keyword.fetch!(opts, :backoff),
      retry_if: fn result ->
        if retryable?(result) do
          Logger.warning("cloud-query gRPC connection dropped, retrying: #{inspect(result)}")
          maybe_resolve(stream)
          true
        else
          false
        end
      end
    )
  end

  def call(stream, req, next, _opts), do: next.(stream, req)

  def retryable?({:error, err}), do: disconnect?(err)
  def retryable?(_), do: false

  def disconnect?(%GRPC.RPCError{status: @unavailable}), do: true
  def disconnect?(%GRPC.RPCError{message: message}), do: connection_closed_message?(message)
  def disconnect?(:no_connection), do: true
  def disconnect?({:error, reason}), do: disconnect?(reason)
  def disconnect?(reason) when is_binary(reason), do: connection_closed_message?(reason)
  def disconnect?(_), do: false

  defp connection_closed_message?(message) when is_binary(message) do
    message = String.downcase(message)

    String.contains?(message, "connection is closed") or
      String.contains?(message, "no_connection") or
      String.contains?(message, "connection_down") or
      String.contains?(message, "socket is closed") or
      String.contains?(message, "connection reset")
  end
  defp connection_closed_message?(_), do: false

  defp maybe_resolve(%{channel: %GRPC.Channel{} = channel}) do
    GRPC.Client.Connection.resolve_now(channel)
  catch
    kind, reason ->
      Logger.debug("cloud-query gRPC resolve_now failed: #{inspect({kind, reason})}")
      :ok
  end
  defp maybe_resolve(_), do: :ok
end
