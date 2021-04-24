defmodule Console.Watchers.Handlers.Upgrade do
  alias Console.Services.{Builds, Users}

  def create_build(%{"message" => msg, "repository" => %{"name" => name}}) do
    bot = Users.get_bot!("console")
    Builds.create(%{message: msg, repository: name}, bot)
  end
end
