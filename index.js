const sqlFormatter = require('sql-formatter');

module.exports = {
  rules: {
    'sql-matching-double-quotes': {
      meta: {
        messages: {
          missingQuote: 'Missing double quote',
        },
      },

      create: function (context) {
        const sourceCode = context.getSourceCode();

        const isCharacter = /[a-zA-Z]/;
        const isNotCharacer = /[^a-zA-Z]+/;

        const reverse = str => str.split('').reverse().join('');

        const reportError = (node, loc) =>
          context.report({
            node,
            loc,
            messageId: 'missingQuote',
          });

        return {
          TemplateLiteral(node) {
            const sqlTagIsPresent =
              node.parent.tag && node.parent.tag.name === 'sql';

            if (sqlTagIsPresent) {
              const [{ value }] = sourceCode.getTokens(node);

              const lines = value.split('\n');

              const { start } = node.loc;

              const offsetLoc = { start: { ...start }, end: { ...start } };

              let activeQuote = false;
              let firstLine = true;

              for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                if (!firstLine) {
                  offsetLoc.start.line += 1;
                  offsetLoc.start.column = 0;

                  offsetLoc.end.line += 1;
                  offsetLoc.end.column = 0;
                }

                firstLine = false;

                for (let j = 0; j < line.length; j++) {
                  const token = line[j];

                  if (activeQuote) {
                    offsetLoc.end.column += 1;
                  } else {
                    offsetLoc.start.column += 1;
                  }

                  if (activeQuote) {
                    if (token === '"') {
                      activeQuote = false;

                      offsetLoc.start = { ...offsetLoc.end };
                    } else if (!isCharacter.test(token)) {
                      reportError(node, offsetLoc);
                      break;
                    } else if (j + 1 === line.length) {
                      reportError(node, offsetLoc);
                      break;
                    }
                  } else {
                    if (token === '"') {
                      // We've hit an end quote thats missing a starting quotes
                      if (line[j + 1] && !isCharacter.test(line[j + 1])) {
                        const reversed = reverse(line.slice(0, j));
                        const matches = isNotCharacer.exec(reversed);

                        const foundQuoteLoc = { ...offsetLoc.start };

                        offsetLoc.start = {
                          line: foundQuoteLoc.line,
                          column: foundQuoteLoc.column - (matches.index + 1),
                        };

                        offsetLoc.end = foundQuoteLoc;

                        reportError(node, offsetLoc);

                        break;
                      }
                      activeQuote = true;

                      offsetLoc.end = { ...offsetLoc.start };
                    }
                  }
                }
              }
            }
          },
        };
      },
    },

    'sql-formatting': {
      meta: {
        fixable: true,
      },

      create: function (context) {
        const sourceCode = context.getSourceCode();

        const isWhitespace = /[\s]/;
        const isNotWhiteSpace = /[^\s]/;
        const templateLiteralExtractor = /\${(.*)}/gs;

        return {
          TemplateLiteral(node) {
            const sqlTagIsPresent =
              node.parent.tag && node.parent.tag.name === 'sql';

            if (sqlTagIsPresent) {
              const tokens = sourceCode.getTokens(node);
              const raw = tokens.map(({ value }) => value).join('');

              let indentation = '';

              console.log({
                first: raw[1] === '\n' ? 2 : 1,
                second: raw.length - (raw[raw.length - 2] === '\n' ? 2 : 1),
              });

              const rawSql = raw
                .slice(
                  raw[1] === '\n' ? 2 : 1,
                  raw.length - (raw[raw.length - 2] === '\n' ? 2 : 1),
                )
                .split('\n')
                .map((value, index) => {
                  if (index === 0) {
                    const matches = isNotWhiteSpace.exec(value);

                    if (matches) {
                      console.log(matches);
                      indentation = new Array(matches.index).fill(' ').join('');
                    }
                  }

                  return isWhitespace.test(value[0])
                    ? value.slice(indentation.length)
                    : value;
                })
                .join('\n')
                .trim();

              const literals = [...rawSql.matchAll(templateLiteralExtractor)];

              const rawSQLWithoutLiterals = literals.reduce(
                (reduced, [literal]) => {
                  return reduced.replace(literal, 'Δ');
                },
                rawSql,
              );

              const formattedSql = sqlFormatter.format(rawSQLWithoutLiterals);

              const formatSqlForFixer = () => {
                const literalsToPutback = literals
                  .map(([literal]) => literal)
                  .reverse();

                let toWrite = formattedSql
                  .split('\n')
                  .map(value => `${indentation}${value}`)
                  .join('\n');

                while (toWrite.includes('Δ')) {
                  toWrite = toWrite.replace('Δ', literalsToPutback.pop());
                }

                return toWrite;
              };

              if (formattedSql !== rawSQLWithoutLiterals) {
                context.report({
                  node,
                  loc: { start: node.loc.start, end: node.loc.start },
                  message: 'Format the query',
                  fix: fixer =>
                    fixer.replaceTextRange(
                      [
                        node.quasis[0].range[0],
                        node.quasis[node.quasis.length - 1].range[1],
                      ],
                      '`\n' + formatSqlForFixer() + '\n' + indentation + '`',
                    ),
                });
              }
            }
          },
        };
      },
    },
  },
};
