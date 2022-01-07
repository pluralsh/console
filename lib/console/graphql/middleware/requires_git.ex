defmodule Console.Middleware.RequiresGit do
  @behaviour Absinthe.Middleware
  alias Console.Bootstrapper

  @error "git is required for this action, but your repository could not be cloned"

  def call(resolution, _) do
    case Bootstrapper.git_enabled?() do
      false -> Absinthe.Resolution.put_result(resolution, {:error, @error})
      _ -> resolution
    end
  end
end
