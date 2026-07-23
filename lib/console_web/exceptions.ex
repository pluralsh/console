defimpl Plug.Exception, for: DBConnection.ConnectionError do
  def status(%{reason: :queue_timeout}), do: 429
  def status(_), do: 500

  def actions(_), do: []
end
