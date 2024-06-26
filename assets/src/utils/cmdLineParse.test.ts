/* eslint-disable no-useless-escape */
import { splitCommand } from './cmdLineParse'

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
