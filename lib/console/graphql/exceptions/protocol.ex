defprotocol Console.GraphQl.Exception do
  @fallback_to_any true
  @spec error(struct) :: term
  def error(event)
end

defimpl Console.GraphQl.Exception, for: Console.InternalException do
  def error(%Console.InternalException{message: message}), do: {400, message}
end

defimpl Console.GraphQl.Exception, for: Any do
  def error(_), do: {500, "unknown error (check the logs for more details)"}
end

defimpl Console.GraphQl.Exception, for: Ecto.NoResultsError do
  def error(_), do: {404, "could not find resource"}
end

defimpl Console.GraphQl.Exception, for: Ecto.CastError do
  def error(_), do: {400, "could not find resource"}
end

defimpl Console.GraphQl.Exception, for: Ecto.Query.CastError do
  def error(_), do: {404, "could not find resource"}
end

defimpl Console.GraphQl.Exception, for: Kazan.RemoteError do
  def error(%Kazan.RemoteError{reason: {:http_error, code, %{"message" => msg}}}) when is_binary(msg),
    do: {code, msg}
  def error(%Kazan.RemoteError{reason: {:http_error, code, _}}),
    do: {code, "kubernetes api request failed with status #{code}"}
  def error(%Kazan.RemoteError{reason: %HTTPoison.Error{} = err}),
    do: Console.GraphQl.Exception.error(err)
  def error(%Kazan.RemoteError{reason: reason}),
    do: {502, "kubernetes api request failed: #{inspect(reason)}"}
end

defimpl Console.GraphQl.Exception, for: HTTPoison.Error do
  def error(%HTTPoison.Error{reason: reason}), do: {503, "upstream request failed: #{inspect(reason)}"}
end

defimpl Console.GraphQl.Exception, for: GRPC.RPCError do
  def error(%GRPC.RPCError{message: message}) when is_binary(message), do: {400, message}
  def error(_), do: {400, "gRPC request failed"}
end
