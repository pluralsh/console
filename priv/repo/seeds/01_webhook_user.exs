import Botanist
import System, only: [get_env: 1]

alias Console.{Repo, Schema}

seed do
  %Schema.User{
    name: "console",
    email: "console@plural.sh",
    bot_name: "console"
  }
  |> Schema.User.changeset(%{password: Ecto.UUID.generate()})
  |> Repo.insert!()
end
