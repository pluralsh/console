defmodule Console.Configuration do
  defstruct [:git_commit]

  def new() do
    %__MODULE__{
      git_commit: Console.conf(:git_commit),
    }
  end
end
