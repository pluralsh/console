package uuid

import (
	"encoding/binary"

	uuid "github.com/satori/go.uuid"
)

func ToInt64(id string) (int64, error) {
	u, err := uuid.FromString(id)
	// TODO: Figure out if we can do it better.
	// uint can end up overflowing int and end up with a negative value
	return int64(binary.BigEndian.Uint64(u[:8])), err
}
