defmodule Console.Watchers.Handlers.Upgrade do
  alias Console.Services.{Builds, Users, Policies}

  def create_build(%{"message" => msg, "repository" => %{"name" => name}} = upgr) do
    bot = Users.get_bot!("console")
    with {:ok, type} when type != :ignore <- {:ok, Policies.upgrade_type(name, upgr["type"])},
         {:error, :invalid_repository} <- Builds.create(%{message: msg, repository: name, type: type}, bot),
      do: {:ok, :ignore}
  end
end
