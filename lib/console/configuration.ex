defmodule Console.Configuration do
  defstruct [:git_commit, :is_demo_project, :is_sandbox, :plural_login]

  def new() do
    %__MODULE__{
      git_commit: Console.conf(:git_commit),
      is_demo_project: Console.conf(:is_demo_project),
      is_sandbox: Console.sandbox?(),
      plural_login: Console.conf(:plural_login)
    }
  end
end
