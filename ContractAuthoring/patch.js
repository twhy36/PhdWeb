const fs = require('fs');
const f = 'node_modules/@microsoft/office-js-helpers/dist/office.helpers.d.ts';

fs.readFile(f, 'utf8', function (err,data) {
  if (err) {
    return console.log(err);
  }

  var result = data.replace('export default function stringify', 'export function stringify');

  fs.writeFile(f, result, 'utf8', function (err) {
    if (err)  {
      return console.log(err);
    }
  });
});