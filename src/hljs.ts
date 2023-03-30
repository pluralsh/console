// Explictly import and register languages we want for highlight.js
import hljs from 'highlight.js/lib/core'

import ada from 'highlight.js/lib/languages/ada'
import apache from 'highlight.js/lib/languages/apache'
import applescript from 'highlight.js/lib/languages/applescript'
import arduino from 'highlight.js/lib/languages/arduino'
import awk from 'highlight.js/lib/languages/awk'
import bash from 'highlight.js/lib/languages/bash'
import basic from 'highlight.js/lib/languages/basic'
import brainfuck from 'highlight.js/lib/languages/brainfuck'
import c from 'highlight.js/lib/languages/c'
import clojure from 'highlight.js/lib/languages/clojure'
import cmake from 'highlight.js/lib/languages/cmake'
import coffeescript from 'highlight.js/lib/languages/coffeescript'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import css from 'highlight.js/lib/languages/css'
import d from 'highlight.js/lib/languages/d'
import dart from 'highlight.js/lib/languages/dart'
import django from 'highlight.js/lib/languages/django'
import dns from 'highlight.js/lib/languages/dns'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import elixir from 'highlight.js/lib/languages/elixir'
import elm from 'highlight.js/lib/languages/elm'
import erlang from 'highlight.js/lib/languages/erlang'
import fortran from 'highlight.js/lib/languages/fortran'
import fsharp from 'highlight.js/lib/languages/fsharp'
import go from 'highlight.js/lib/languages/go'
import gradle from 'highlight.js/lib/languages/gradle'
import graphql from 'highlight.js/lib/languages/graphql'
import haml from 'highlight.js/lib/languages/haml'
import handlebars from 'highlight.js/lib/languages/handlebars'
import haskell from 'highlight.js/lib/languages/haskell'
import haxe from 'highlight.js/lib/languages/haxe'
import http from 'highlight.js/lib/languages/http'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import kotlin from 'highlight.js/lib/languages/kotlin'
import latex from 'highlight.js/lib/languages/latex'
import less from 'highlight.js/lib/languages/less'
import lisp from 'highlight.js/lib/languages/lisp'
import llvm from 'highlight.js/lib/languages/llvm'
import lua from 'highlight.js/lib/languages/lua'
import makefile from 'highlight.js/lib/languages/makefile'
import markdown from 'highlight.js/lib/languages/markdown'
import nginx from 'highlight.js/lib/languages/nginx'
import nodeRepl from 'highlight.js/lib/languages/node-repl'
import ocaml from 'highlight.js/lib/languages/ocaml'
import perl from 'highlight.js/lib/languages/perl'
import pgsql from 'highlight.js/lib/languages/pgsql'
import php from 'highlight.js/lib/languages/php'
import plaintext from 'highlight.js/lib/languages/plaintext'
import powershell from 'highlight.js/lib/languages/powershell'
import prolog from 'highlight.js/lib/languages/prolog'
import python from 'highlight.js/lib/languages/python'
import q from 'highlight.js/lib/languages/q'
import qml from 'highlight.js/lib/languages/qml'
import r from 'highlight.js/lib/languages/r'
import reasonml from 'highlight.js/lib/languages/reasonml'
import ruby from 'highlight.js/lib/languages/ruby'
import rust from 'highlight.js/lib/languages/rust'
import scala from 'highlight.js/lib/languages/scala'
import scheme from 'highlight.js/lib/languages/scheme'
import scss from 'highlight.js/lib/languages/scss'
import shell from 'highlight.js/lib/languages/shell'
import smalltalk from 'highlight.js/lib/languages/smalltalk'
import sql from 'highlight.js/lib/languages/sql'
import stylus from 'highlight.js/lib/languages/stylus'
import swift from 'highlight.js/lib/languages/swift'
import typescript from 'highlight.js/lib/languages/typescript'
import vbnet from 'highlight.js/lib/languages/vbnet'
import vbscript from 'highlight.js/lib/languages/vbscript'
import vim from 'highlight.js/lib/languages/vim'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'

/*
 * highlight.js terraform syntax highlighting definition
 *
 * @see https://github.com/highlightjs/highlight.js
 *
 * @package: highlightjs-terraform
 * @author:  Nikos Tsirmirakis <nikos.tsirmirakis@winopsdba.com>
 * @since:   2019-03-20
 *
 * Description: Terraform (HCL) language definition
 * Category: scripting
 */

export function terraform(hljs: any) {
  const NUMBERS = {
    className: 'number',
    begin: '\\b\\d+(\\.\\d+)?',
    relevance: 0,
  }
  const STRINGS = {
    className: 'string',
    begin: '"',
    end: '"',
    contains: [
      {
        className: 'variable',
        begin: '\\${',
        end: '\\}',
        relevance: 9,
        contains: [
          {
            className: 'string',
            begin: '"',
            end: '"',
          },
          {
            className: 'meta',
            begin: '[A-Za-z_0-9]*\\(',
            end: '\\)',
            contains: [
              NUMBERS,
              {
                className: 'string',
                begin: '"',
                end: '"',
                contains: [
                  {
                    className: 'variable',
                    begin: '\\${',
                    end: '\\}',
                    contains: [
                      {
                        className: 'string',
                        begin: '"',
                        end: '"',
                        contains: [
                          {
                            className: 'variable',
                            begin: '\\${',
                            end: '\\}',
                          },
                        ],
                      },
                      {
                        className: 'meta',
                        begin: '[A-Za-z_0-9]*\\(',
                        end: '\\)',
                      },
                    ],
                  },
                ],
              },
              'self',
            ],
          },
        ],
      },
    ],
  }

  return {
    aliases: ['tf', 'hcl'],
    keywords:
      'resource variable provider output locals module data terraform|10',
    literal: 'false true null',
    contains: [hljs.COMMENT('\\#', '$'), NUMBERS, STRINGS],
  }
}

hljs.registerLanguage('ada', ada)
hljs.registerLanguage('apache', apache)
hljs.registerLanguage('applescript', applescript)
hljs.registerLanguage('arduino', arduino)
hljs.registerLanguage('awk', awk)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('basic', basic)
hljs.registerLanguage('brainfuck', brainfuck)
hljs.registerLanguage('c', c)
hljs.registerLanguage('clojure', clojure)
hljs.registerLanguage('cmake', cmake)
hljs.registerLanguage('coffeescript', coffeescript)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('csharp', csharp)
hljs.registerLanguage('css', css)
hljs.registerLanguage('d', d)
hljs.registerLanguage('dart', dart)
hljs.registerLanguage('django', django)
hljs.registerLanguage('dns', dns)
hljs.registerLanguage('dockerfile', dockerfile)
hljs.registerLanguage('elixir', elixir)
hljs.registerLanguage('elm', elm)
hljs.registerLanguage('erlang', erlang)
hljs.registerLanguage('fortran', fortran)
hljs.registerLanguage('fsharp', fsharp)
hljs.registerLanguage('go', go)
hljs.registerLanguage('gradle', gradle)
hljs.registerLanguage('graphql', graphql)
hljs.registerLanguage('haml', haml)
hljs.registerLanguage('handlebars', handlebars)
hljs.registerLanguage('haskell', haskell)
hljs.registerLanguage('haxe', haxe)
hljs.registerLanguage('http', http)
hljs.registerLanguage('java', java)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('kotlin', kotlin)
hljs.registerLanguage('latex', latex)
hljs.registerLanguage('less', less)
hljs.registerLanguage('lisp', lisp)
hljs.registerLanguage('llvm', llvm)
hljs.registerLanguage('lua', lua)
hljs.registerLanguage('makefile', makefile)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('nginx', nginx)
hljs.registerLanguage('node-repl', nodeRepl)
hljs.registerLanguage('ocaml', ocaml)
hljs.registerLanguage('perl', perl)
hljs.registerLanguage('pgsql', pgsql)
hljs.registerLanguage('php', php)
hljs.registerLanguage('plaintext', plaintext)
hljs.registerLanguage('powershell', powershell)
hljs.registerLanguage('prolog', prolog)
hljs.registerLanguage('python', python)
hljs.registerLanguage('q', q)
hljs.registerLanguage('qml', qml)
hljs.registerLanguage('r', r)
hljs.registerLanguage('reasonml', reasonml)
hljs.registerLanguage('ruby', ruby)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('scala', scala)
hljs.registerLanguage('scheme', scheme)
hljs.registerLanguage('scss', scss)
hljs.registerLanguage('shell', shell)
hljs.registerLanguage('smalltalk', smalltalk)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('stylus', stylus)
hljs.registerLanguage('swift', swift)
hljs.registerLanguage('terraform', terraform)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('vbnet', vbnet)
hljs.registerLanguage('vbscript', vbscript)
hljs.registerLanguage('vim', vim)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('yaml', yaml)
