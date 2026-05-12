defimpl Swoosh.Email.Recipient, for: Console.Schema.User do
  def format(%@for{name: n, email: e}), do: {n, e}
end
