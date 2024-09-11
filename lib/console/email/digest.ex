defmodule Console.Email.Digest do
  alias Console.Schema.{AppNotification}
  alias Console.Repo

  alias Console.Email.Builder.Digest

  def normal() do
    Timex.now()
    |> Timex.shift(minutes: -120)
    |> AppNotification.digest()
    |> Repo.stream(method: :keyset)
    |> Flow.from_enumerable(stages: 5)
    |> Flow.map(fn row -> Digest.email(row.user, row.count) end)
    |> Flow.map(&Console.Mailer.maybe_deliver/1)
    |> Flow.run()
  end
end
