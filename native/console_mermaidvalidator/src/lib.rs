use rustler::types::binary::Binary;
use rustler::{Encoder, Env, Term};

mod atoms {
    rustler::atoms! {
        ok,
        error
    }
}

#[rustler::nif]
fn validate<'a>(env: Env<'a>, input: Binary<'a>) -> Term<'a> {
    let source = match std::str::from_utf8(input.as_slice()) {
        Ok(source) => source,
        Err(err) => return (atoms::error(), err.to_string()).encode(env),
    };

    match selkie::parse(source) {
        Ok(_) => atoms::ok().encode(env),
        Err(err) => (atoms::error(), err.to_string()).encode(env),
    }
}

rustler::init!("Elixir.Console.MermaidValidator");
