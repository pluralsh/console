package prototool

import (
	"reflect"
	"time"

	"google.golang.org/protobuf/types/known/durationpb"
)

// NotNil ensures that the memory that the field pointer is pointing to is not nil.
// field must be a valid pointer. It's target is checked for nil-ness and populated if it's nil.
func NotNil(field interface{}) {
	v := reflect.ValueOf(field)
	vValue := v.Elem() // follow the pointer
	if !vValue.IsNil() {
		return
	}
	vValue.Set(reflect.New(vValue.Type().Elem()))
}

func Duration(d **durationpb.Duration, defaultValue time.Duration) {
	if *d == nil {
		*d = durationpb.New(defaultValue)
	}
}

func String(s *string, defaultValue string) {
	if *s == "" {
		*s = defaultValue
	}
}

func StringPtr(s **string, defaultValue string) {
	if *s == nil {
		*s = &defaultValue
	}
}

func Float64(s *float64, defaultValue float64) {
	if *s == 0 {
		*s = defaultValue
	}
}

func Int32Ptr(d **int32, defaultValue int32) {
	if *d == nil {
		*d = &defaultValue
	}
}

func Uint32(d *uint32, defaultValue uint32) {
	if *d == 0 {
		*d = defaultValue
	}
}

func Uint32Ptr(d **uint32, defaultValue uint32) {
	if *d == nil {
		*d = &defaultValue
	}
}
