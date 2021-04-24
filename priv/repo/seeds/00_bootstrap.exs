import Botanist
import System, only: [get_env: 1]

alias Console.{Repo, Schema}

seed do
  %Schema.User{
    name: get_env("ADMIN_NAME"),
    email: get_env("ADMIN_EMAIL"),
  }
  |> Schema.User.changeset(%{password: get_env("ADMIN_PASSWORD"), roles: %{admin: true}})
  |> Repo.insert!()
end
