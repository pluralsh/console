import Botanist
import System, only: [get_env: 1]

alias Watchman.{Repo, Schema}

seed do
  %Schema.User{
    name: "watchman",
    email: "watchman@piazza.app",
    bot_name: "watchman"
  }
  |> Schema.User.changeset(%{password: Ecto.UUID.generate()})
  |> Repo.insert!()
end