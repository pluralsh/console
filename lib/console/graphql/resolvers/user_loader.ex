defmodule Console.GraphQl.Resolvers.UserLoader do
  alias Console.Schema.User

  def data(_) do
    Dataloader.KV.new(&query/2, max_concurrency: 1)
  end

  def query(_, emails) do
    users = fetch_users(emails)
    Map.new(emails, & {&1, users[&1]})
  end

  def fetch_users(emails) do
    MapSet.to_list(emails)
    |> User.with_emails()
    |> Console.Repo.all()
    |> Map.new(& {&1.email, &1})
  end
end
