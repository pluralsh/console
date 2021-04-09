defmodule Watchman.PubSub.BuildSucceeded, do: use Piazza.PubSub.Event
defmodule Watchman.PubSub.BuildFailed, do: use Piazza.PubSub.Event
defmodule Watchman.PubSub.BuildDeleted, do: use Piazza.PubSub.Event
defmodule Watchman.PubSub.BuildPending, do: use Piazza.PubSub.Event
defmodule Watchman.PubSub.BuildApproved, do: use Piazza.PubSub.Event
defmodule Watchman.PubSub.BuildCreated, do: use Piazza.PubSub.Event
defmodule Watchman.PubSub.BuildUpdated, do: use Piazza.PubSub.Event
defmodule Watchman.PubSub.BuildCancelled, do: use Piazza.PubSub.Event
defmodule Watchman.PubSub.BuildUpdated, do: use Piazza.PubSub.Event

defmodule Watchman.PubSub.CommandCreated, do: use Piazza.PubSub.Event
defmodule Watchman.PubSub.CommandCompleted, do: use Piazza.PubSub.Event

defmodule Watchman.PubSub.UserCreated, do: use Piazza.PubSub.Event
