defmodule Console.Configuration do
  defstruct [:git_commit, :is_demo_project, :is_sandbox]

  def new() do
    %__MODULE__{
      git_commit: Console.conf(:git_commit),
      is_demo_project: Console.conf(:is_demo_project),
      is_sandbox: Console.sandbox?()
    }
  end
end
