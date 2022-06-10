defmodule Console.Configuration do
  defstruct [:git_commit, :is_demo_project]

  def new() do
    %__MODULE__{
      git_commit: Console.conf(:git_commit),
      is_demo_project: Console.conf(:is_demo_project),
    }
  end
end
