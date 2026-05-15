package api

// Storage defines the storage options for the database.
type Storage string

const (
	// StorageMemory stores data in-memory.
	StorageMemory Storage = "file::memory:?mode=memory&cache=shared"

	// StorageFile stores data in a file on a disk.
	StorageFile Storage = "file"
)
