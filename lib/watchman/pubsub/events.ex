defmodule Watchman.PubSub.BuildSucceeded, do: use Piazza.PubSub.Event
defmodule Watchman.PubSub.BuildFailed, do: use Piazza.PubSub.Event
defmodule Watchman.PubSub.BuildDeleted, do: use Piazza.PubSub.Event
defmodule Watchman.PubSub.BuildPending, do: use Piazza.PubSub.Event
defmodule Watchman.PubSub.BuildApproved, do: use Piazza.PubSub.Event
defmodule Watchman.PubSub.UserCreated, do: use Piazza.PubSub.Event