package algorithms

type Numeric interface {
	int | int8 | int16 | int32 | int64 | float64 | float32
}

func Max[T Numeric](a, b T) T {
	if a > b {
		return a
	}

	return b
}
