defmodule Watchman.Watchers.Handlers.Upgrade do
  alias Watchman.Services.{Builds, Users}

  def create_build(%{"message" => msg, "repository" => %{"name" => name}}) do
    bot = Users.get_bot!("watchman")
    Builds.create(%{message: msg, repository: name}, bot)
  end
end
