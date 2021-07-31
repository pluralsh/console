defmodule Console.Plural.Installation do
  defstruct [:id, :repository]
end

defmodule Console.Plural.Dashboard do
  defstruct [:name, :uid]
end

defmodule Console.Plural.Repository do
  defstruct [:id, :icon, :name, :description, :dashboards]
end

defmodule Console.Plural.Recipe do
  defstruct [:id, :name, :description, :provider, :recipeSections]
end

defmodule Console.Plural.RecipeSection do
  defstruct [:id, :repository, :recipeItems]
end

defmodule Console.Plural.RecipeItem do
  defstruct [:id, :configuration]
end

defmodule Console.Plural.ConfigurationItem do
  defstruct [:name, :default, :documentation, :type, :placeholder]
end

defmodule Console.Plural.Edge do
  defstruct [:node]
end

defmodule Console.Plural.PageInfo do
  defstruct [:endCursor, :hasNextPage]
end

defmodule Console.Plural.Connection do
  defstruct [:edges, :pageInfo]
end

defmodule Console.Plural.UpgradeQueue do
  defstruct [:id]
end
