# eslint-plugin-improvin

Custom eslint rules created by and used by the Improvin development team


## Deprecated

This repository is unmaintained. Don't use it!

Instead, use a plugin like https://www.npmjs.com/package/eslint-plugin-sql. 


## Installation

### Install command with eslint-config-improvin

`yarn add --dev https://github.com/plantaseed/eslint-config-improvin.git https://github.com/plantaseed/eslint-plugin-improvin.git`

### How the sql linting works

To get the sql linting rules to work you must tag the template strings containing sql with a sql tag.
It can either be one that has extra logic or something as simple as `const sql = x => x;`

#### Example

```javascript
sql`SELECT * FROM "table_name"`;
```

### Rules

1. `improvin/sql-matching-double-quotes`: Checks if you have incorrectly formatted double quotes for a postgres query

   - OK: select "tableName"."fieldName" from "tableName";
   - BAD: select tableName"."fieldName" from "tableName"; || select "tableName."fieldName" from "tableName";

2. `improvin/sql-formatting`: Errors if your sql template string is not formatted the same way as the npm package sql-formatter
   - We make use of this rule with eslints auto fixing
