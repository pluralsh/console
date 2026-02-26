package grpctool

import (
	"context"
	"fmt"
	"net"
	"net/url"
	"strings"

	"github.com/ash2k/stager"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"

	"github.com/pluralsh/kubernetes-agent/pkg/tool/prototool"
)

func HandleIoError(msg string, err error) error {
	if IsStatusError(err) {
		s := status.Convert(err).Proto()
		s.Message = fmt.Sprintf("%s: %s", msg, s.Message)
		err = status.ErrorProto(s)
	} else {
		err = status.Errorf(codes.Canceled, "%s: %v", msg, err)
	}
	return err
}

func RequestCanceledOrTimedOut(err error) bool {
	return RequestCanceled(err) || RequestTimedOut(err)
}

func RequestCanceled(err error) bool {
	for err != nil {
		if err == context.Canceled { // nolint:errorlint
			return true
		}
		code := status.Code(err)
		if code == codes.Canceled {
			return true
		}
		switch x := err.(type) { // nolint:errorlint
		case interface{ Unwrap() error }:
			err = x.Unwrap()
		case interface{ Unwrap() []error }: // support errors produced by errors.Join()
			for _, err = range x.Unwrap() {
				if RequestCanceled(err) {
					return true
				}
			}
			return false
		default:
			return false
		}
	}
	return false
}

func RequestTimedOut(err error) bool {
	for err != nil {
		if err == context.DeadlineExceeded { // nolint:errorlint
			return true
		}
		code := status.Code(err)
		if code == codes.DeadlineExceeded {
			return true
		}
		switch x := err.(type) { // nolint:errorlint
		case interface{ Unwrap() error }:
			err = x.Unwrap()
		case interface{ Unwrap() []error }: // support errors produced by errors.Join()
			for _, err = range x.Unwrap() {
				if RequestTimedOut(err) {
					return true
				}
			}
			return false
		default:
			return false
		}
	}
	return false
}

func StartServer(stage stager.Stage, server *grpc.Server, listener func() (net.Listener, error), onStop func()) {
	stage.Go(func(ctx context.Context) error {
		// gRPC listener
		lis, err := listener()
		if err != nil {
			return err
		}
		return server.Serve(lis)
	})
	stage.Go(func(ctx context.Context) error {
		<-ctx.Done() // can be cancelled because Serve() failed or main ctx was canceled or some stage failed
		onStop()
		server.GracefulStop()
		return nil
	})
}

func IsStatusError(err error) bool {
	_, ok := err.(interface { // nolint:errorlint
		GRPCStatus() *status.Status
	})
	return ok
}

func MetaToValuesMap(meta metadata.MD) map[string]*prototool.Values {
	if len(meta) == 0 {
		return nil
	}
	result := make(map[string]*prototool.Values, len(meta))
	for k, v := range meta {
		val := make([]string, len(v))
		copy(val, v) // metadata may be mutated, so copy
		result[k] = &prototool.Values{
			Value: val,
		}
	}
	return result
}

func ValuesMapToMeta(vals map[string]*prototool.Values) metadata.MD {
	if len(vals) == 0 {
		return nil
	}
	result := make(metadata.MD, len(vals))
	keysLen := 0
	for _, v := range vals {
		keysLen += len(v.Value)
	}
	keys := make([]string, 0, keysLen) // allocate backing array for all elements in one go
	for k, v := range vals {
		keys = append(keys, v.Value...)
		// set capacity to length to protect against potential append overwriting next value
		lk := len(keys)
		result[k] = keys[:lk:lk]
		keys = keys[lk:]
	}
	return result
}

func SplitGrpcMethod(fullMethodName string) (string /* service */, string /* method */) {
	if fullMethodName != "" && fullMethodName[0] == '/' {
		fullMethodName = fullMethodName[1:]
	}
	pos := strings.LastIndex(fullMethodName, "/")
	if pos == -1 {
		return "unknown", fullMethodName
	}
	service := fullMethodName[:pos]
	method := fullMethodName[pos+1:]
	return service, method
}

// StatusErrorFromContext is a version of status.FromContextError(ctx.Err()).Err() that allows to augment the
// error message.
func StatusErrorFromContext(ctx context.Context, msg string) error {
	err := ctx.Err()
	var code codes.Code
	switch err { // nolint: errorlint
	case context.Canceled:
		code = codes.Canceled
	case context.DeadlineExceeded:
		code = codes.DeadlineExceeded
	default:
		code = codes.Unknown
	}
	return status.Errorf(code, "%s: %v", msg, err)
}

// HostWithPort adds port if it was not specified in a URL with a "grpc" or "grpcs" scheme.
func HostWithPort(u *url.URL) string {
	port := u.Port()
	if port != "" {
		return u.Host
	}
	switch u.Scheme {
	case "grpc":
		return net.JoinHostPort(u.Host, "80")
	case "grpcs":
		return net.JoinHostPort(u.Host, "443")
	default:
		// Function called with unknown scheme, just return the original host.
		return u.Host
	}
}
