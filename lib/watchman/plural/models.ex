defmodule Watchman.Plural.Installation do
  defstruct [:id, :repository]
end

defmodule Watchman.Plural.Dashboard do
  defstruct [:name, :uid]
end

defmodule Watchman.Plural.Repository do
  defstruct [:id, :icon, :name, :description, :dashboards]
end

defmodule Watchman.Plural.Edge do
  defstruct [:node]
end

defmodule Watchman.Plural.PageInfo do
  defstruct [:endCursor, :hasNextPage]
end

defmodule Watchman.Plural.Connection do
  defstruct [:edges, :pageInfo]
end

defmodule Watchman.Plural.UpgradeQueue do
  defstruct [:id]
end
