package grpctool

import (
	"reflect"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/reflect/protoreflect"
	"google.golang.org/protobuf/reflect/protoregistry"
)

var (
	errorType = reflect.TypeOf((*error)(nil)).Elem()
)

type config struct {
	reflectMessage            protoreflect.Message
	goMessageType             reflect.Type
	oneof                     protoreflect.OneofDescriptor
	eofCallback               EOFCallback
	invalidTransitionCallback InvalidTransitionCallback
	startState                protoreflect.FieldNumber
	notExpectingFields        map[protoreflect.FieldNumber]codes.Code    // fields that are not expected during this invocation
	msgCallbacks              map[protoreflect.FieldNumber]reflect.Value // callbacks that accept the whole message
	fieldCallbacks            map[protoreflect.FieldNumber]reflect.Value // callbacks that accept a specific field type of the oneof
}

// StreamVisitorOption is an option for the visitor.
// Must return nil or an error, compatible with the gRPC status package.
type StreamVisitorOption func(*config) error

// WithEOFCallback sets a callback for end of stream.
func WithEOFCallback(cb EOFCallback) StreamVisitorOption {
	return func(c *config) error {
		c.eofCallback = cb
		return nil
	}
}

// WithNotExpectingToGet is used to list fields that the caller is not expecting to get during this Visit() invocation.
func WithNotExpectingToGet(code codes.Code, transitionTo ...protoreflect.FieldNumber) StreamVisitorOption {
	return func(c *config) error {
		if len(transitionTo) == 0 {
			return status.Error(codes.Internal, "at least one field number is required")
		}
		for _, f := range transitionTo {
			_, err := checkField(c, f)
			if err != nil {
				return err
			}
			c.notExpectingFields[f] = code
		}
		return nil
	}
}

// WithCallback registers cb to be called when entering transitionTo when parsing the stream. Only one callback can be registered per target
func WithCallback(transitionTo protoreflect.FieldNumber, cb MessageCallback) StreamVisitorOption {
	return func(c *config) error {
		cbType := reflect.TypeOf(cb)
		if cbType.Kind() != reflect.Func {
			return status.Errorf(codes.Internal, "cb must be a function, got: %T", cb)
		}
		if cbType.NumIn() != 1 {
			return status.Errorf(codes.Internal, "cb must take one parameter only, got: %T", cb)
		}
		if cbType.NumOut() != 1 {
			return status.Errorf(codes.Internal, "cb must return one value only, got: %T", cb)
		}
		if cbType.Out(0) != errorType {
			return status.Errorf(codes.Internal, "cb must return an error, got: %T", cb)
		}
		field, err := checkField(c, transitionTo)
		if err != nil {
			return err
		}
		inType := cbType.In(0)
		if c.goMessageType.AssignableTo(inType) {
			c.msgCallbacks[transitionTo] = reflect.ValueOf(cb)
			return nil
		}
		var goField interface{}
		switch field.Kind() { // nolint:exhaustive
		case protoreflect.MessageKind:
			goField = c.reflectMessage.Get(field).Message().Interface()
		case protoreflect.EnumKind:
			et, err := protoregistry.GlobalTypes.FindEnumByName(field.Enum().FullName())
			if err != nil {
				return status.Errorf(codes.Internal, "FindEnumByName(): %v", err)
			}
			goField = et.New(0)
		default:
			goField = c.reflectMessage.Get(field).Interface()
		}
		if !reflect.TypeOf(goField).AssignableTo(inType) {
			return status.Errorf(codes.Internal, "callback must be a function with one parameter of type %s or the oneof field type %T, got: %T", c.goMessageType, goField, cb)
		}
		c.fieldCallbacks[transitionTo] = reflect.ValueOf(cb)
		return nil
	}
}

func WithInvalidTransitionCallback(cb InvalidTransitionCallback) StreamVisitorOption {
	return func(c *config) error {
		c.invalidTransitionCallback = cb
		return nil
	}
}

// WithStartState allows to specify a custom automata start state.
// The visitor then acts as if it has just visited field with startState number.
func WithStartState(startState protoreflect.FieldNumber) StreamVisitorOption {
	return func(c *config) error {
		c.startState = startState
		return nil
	}
}

func checkField(c *config, transitionTo protoreflect.FieldNumber) (protoreflect.FieldDescriptor, error) {
	if _, exists := c.notExpectingFields[transitionTo]; exists {
		return nil, status.Errorf(codes.Internal, "field %d has already been marked as unexpected", transitionTo)
	}
	if existingCb, exists := c.msgCallbacks[transitionTo]; exists {
		return nil, status.Errorf(codes.Internal, "callback for %d has already been defined: %v", transitionTo, existingCb)
	}
	if existingCb, exists := c.fieldCallbacks[transitionTo]; exists {
		return nil, status.Errorf(codes.Internal, "callback for %d has already been defined: %v", transitionTo, existingCb)
	}
	field := c.oneof.Fields().ByNumber(transitionTo)
	if field == nil {
		return nil, status.Errorf(codes.Internal, "oneof %s does not have a field %d", c.oneof.FullName(), transitionTo)
	}
	return field, nil
}

func defaultInvalidTransitionCallback(from, to protoreflect.FieldNumber, allowed []protoreflect.FieldNumber, message proto.Message) error {
	return status.Errorf(codes.InvalidArgument, "transition from %d to %d is not allowed. Allowed: %v", from, to, allowed)
}

func defaultEOFCallback() error {
	return nil
}
