/* eslint-disable no-useless-escape */
import { parseScript, splitCommand } from './cmdLineParse'

describe('parseScript', () => {
  it('can parse a script with multiline commands', () => {
    const script = `echo "hello world"
    some --long "command" \
      --multi-line \
      --command
    sleep 100
    `

    const res = parseScript(script)

    expect(res[0]).to.deep.equal({ cmd: 'echo', args: ['hello world'] })
    expect(res[1]).to.deep.equal({
      cmd: 'some',
      args: ['--long', 'command', '--multi-line', '--command'],
    })
    expect(res[2]).to.deep.equal({ cmd: 'sleep', args: ['100'] })
  })

  it('can parse a without multiline commands', () => {
    const script = `echo "hello world"
    some --long "command"
    sleep 100
    `

    const res = parseScript(script)

    expect(res[0]).to.deep.equal({ cmd: 'echo', args: ['hello world'] })
    expect(res[1]).to.deep.equal({ cmd: 'some', args: ['--long', 'command'] })
    expect(res[2]).to.deep.equal({ cmd: 'sleep', args: ['100'] })
  })
})

describe('splitCommand', () => {
  it('should handle simple command with spaces', () => {
    const input = 'ls -la /home/user'
    const expected = { cmd: 'ls', args: ['-la', '/home/user'] }

    expect(splitCommand(input)).to.deep.equal(expected)
  })

  it('should handle command with double quotes', () => {
    const input = 'echo "Hello World"'
    const expected = { cmd: 'echo', args: ['Hello World'] }

    expect(splitCommand(input)).to.deep.equal(expected)
  })

  it('should handle command with single quotes', () => {
    const input = "echo 'Hello World'"
    const expected = { cmd: 'echo', args: ['Hello World'] }

    expect(splitCommand(input)).to.deep.equal(expected)
  })

  it('should handle command with escaped spaces', () => {
    const input = 'echo Hello\\ World'
    const expected = { cmd: 'echo', args: ['Hello World'] }

    expect(splitCommand(input)).to.deep.equal(expected)
  })

  it('should handle command with mixed quotes', () => {
    const input = `echo "Hello 'World'"`
    const expected = { cmd: 'echo', args: ["Hello 'World'"] }

    expect(splitCommand(input)).to.deep.equal(expected)
  })

  it('should handle command with escaped quotes', () => {
    const input = `echo \\"Hello\\" 'World'`
    const expected = { cmd: 'echo', args: ['"Hello"', 'World'] }

    expect(splitCommand(input)).to.deep.equal(expected)
  })

  it('should handle command with nested quotes', () => {
    const input = `echo "Hello 'nested' World"`
    const expected = { cmd: 'echo', args: ["Hello 'nested' World"] }

    expect(splitCommand(input)).to.deep.equal(expected)
  })

  it('should handle command with multiple spaces', () => {
    const input = `   echo     "Hello   World"   `
    const expected = { cmd: 'echo', args: ['Hello   World'] }

    expect(splitCommand(input)).to.deep.equal(expected)
  })

  it('should handle empty command', () => {
    const input = ``
    const expected = { cmd: '', args: [] }

    expect(splitCommand(input)).to.deep.equal(expected)
  })

  it('should handle command with only quotes', () => {
    const input = `echo "" ''`
    const expected = { cmd: 'echo', args: ['', ''] }

    expect(splitCommand(input)).to.deep.equal(expected)
  })

  it('should handle command with unmatched quotes', () => {
    const input = `echo "Hello World`
    const expected = { cmd: 'echo', args: ['Hello World'] }

    expect(splitCommand(input)).to.deep.equal(expected)
  })

  it('should handle internal quotes in flags', () => {
    const input = `command --flag="internal quote"`
    const expected = {
      cmd: 'command',
      args: ['--flag="internal quote"'],
    }

    expect(splitCommand(input)).to.deep.equal(expected)
  })

  it('should handle complex command with mixed escaped characters and quotes', () => {
    const input = `command "arg with spaces" 'another arg' escaped\\ space \\\"escaped quotes\\\"`
    const expected = {
      cmd: 'command',
      args: [
        'arg with spaces',
        'another arg',
        'escaped space',
        '"escaped',
        'quotes"',
      ],
    }

    expect(splitCommand(input)).to.deep.equal(expected)
  })
})
