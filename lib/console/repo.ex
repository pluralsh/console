defmodule Console.Repo do
  use Ecto.Repo,
    otp_app: :console,
    adapter: Ecto.Adapters.Postgres

  use Bourne
end
