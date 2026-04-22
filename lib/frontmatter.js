/**
 * Minimal YAML frontmatter parser.
 * Handles the subset used by template.md files (scalars, arrays, objects-in-arrays,
 * and one nested object-array level for providers[].models[]).
 */

export function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const yaml = match[1];
  return parseYaml(yaml);
}

function parseYaml(text) {
  const result = {};
  const lines = text.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip blank lines and comments
    if (!line.trim() || line.trim().startsWith('#')) {
      i++;
      continue;
    }

    const keyMatch = line.match(/^(\w[\w_]*):\s*(.*)/);
    if (!keyMatch) { i++; continue; }

    const key = keyMatch[1];
    let value = keyMatch[2].trim();

    // Inline array: [a, b, c]
    if (value.startsWith('[')) {
      result[key] = parseInlineArray(value);
      i++;
      continue;
    }

    // Quoted string
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      result[key] = value.slice(1, -1);
      i++;
      continue;
    }

    // Empty value — check for block array/object below
    if (value === '') {
      const items = [];
      let j = i + 1;
      while (j < lines.length && lines[j].match(/^  - /)) {
        const itemLine = lines[j].replace(/^  - /, '').trim();
        let k = j + 1;
        const subKeys = {};
        let hasSubKeys = false;
        while (k < lines.length && lines[k].match(/^    /)) {
          if (lines[k].match(/^      /)) {
            k++;
            continue;
          }
          const subMatch = lines[k].match(/^    (\w[\w_]*):\s*(.*)/);
          if (subMatch) {
            hasSubKeys = true;
            const nestedKey = subMatch[1];
            let sv = subMatch[2].trim();

            if (sv === '') {
              const nestedItems = [];
              k++;
              while (k < lines.length && lines[k].match(/^      - /)) {
                const nestedItemLine = lines[k].replace(/^      - /, '').trim();
                const nestedObj = {};
                const nestedFirstKey = nestedItemLine.match(/^(\w[\w_]*):\s*(.*)/);
                if (nestedFirstKey) {
                  nestedObj[nestedFirstKey[1]] = coerceValue(nestedFirstKey[2].trim());
                  k++;
                  while (k < lines.length && lines[k].match(/^        \w/)) {
                    const attrMatch = lines[k].match(/^        (\w[\w_]*):\s*(.*)/);
                    if (attrMatch) {
                      nestedObj[attrMatch[1]] = coerceValue(attrMatch[2].trim());
                    }
                    k++;
                  }
                  nestedItems.push(nestedObj);
                } else {
                  nestedItems.push(coerceValue(nestedItemLine));
                  k++;
                }
              }
              subKeys[nestedKey] = nestedItems;
              continue;
            }

            subKeys[nestedKey] = coerceValue(sv);
          }
          k++;
        }

        if (hasSubKeys) {
          // First line of block item may have a key: value too
          const firstKeyMatch = itemLine.match(/^(\w[\w_]*):\s*(.*)/);
          if (firstKeyMatch) {
            subKeys[firstKeyMatch[1]] = coerceValue(firstKeyMatch[2].trim());
          }
          items.push(subKeys);
          j = k;
        } else {
          items.push(coerceValue(itemLine));
          j++;
        }
      }

      if (items.length > 0) {
        result[key] = items;
        i = j;
        continue;
      }

      const obj = {};
      j = i + 1;
      while (j < lines.length && lines[j].match(/^  \w/)) {
        const objMatch = lines[j].match(/^  (\w[\w_]*):\s*(.*)/);
        if (objMatch) {
          obj[objMatch[1]] = coerceValue(objMatch[2].trim());
        }
        j++;
      }

      if (Object.keys(obj).length > 0) {
        result[key] = obj;
        i = j;
        continue;
      }

      result[key] = '';
      i++;
      continue;
    }

    // Plain scalar
    result[key] = coerceValue(value);
    i++;
  }

  return result;
}

function parseInlineArray(str) {
  const inner = str.slice(1, -1);
  return inner.split(',').map(s => {
    s = s.trim();
    if ((s.startsWith('"') && s.endsWith('"')) ||
        (s.startsWith("'") && s.endsWith("'"))) {
      return s.slice(1, -1);
    }
    return s;
  }).filter(Boolean);
}

function coerceValue(val) {
  if ((val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1);
  }
  if (val.startsWith('[') && val.endsWith(']')) {
    return parseInlineArray(val);
  }
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val === 'null' || val === '~') return null;
  if (/^\d+$/.test(val)) return parseInt(val, 10);
  if (/^\d+\.\d+$/.test(val)) return parseFloat(val);
  return val;
}
