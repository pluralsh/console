defmodule Console.Watchers.Handlers.Upgrade do
  alias Console.Services.{Builds, Users, Policies}

  def create_build(%{"message" => msg, "repository" => %{"name" => name}}) do
    bot = Users.get_bot!("console")
    case Policies.upgrade_type(name) do
      :ignore -> {:ok, :ignore}
      type ->
        Builds.create(%{message: msg, repository: name, type: type}, bot)
    end
  end
end
