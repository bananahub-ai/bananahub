/**
 * Minimal YAML frontmatter parser.
 * Handles the subset used by template.md files (scalars, arrays, objects-in-arrays).
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
      // Look ahead for block array (lines starting with "  - ")
      const items = [];
      let j = i + 1;
      while (j < lines.length && lines[j].match(/^  - /)) {
        const itemLine = lines[j].replace(/^  - /, '').trim();
        // Check if this array item has sub-keys
        let k = j + 1;
        const subKeys = {};
        let hasSubKeys = false;
        while (k < lines.length && lines[k].match(/^    \w/)) {
          const subMatch = lines[k].match(/^    (\w[\w_]*):\s*(.*)/);
          if (subMatch) {
            hasSubKeys = true;
            let sv = subMatch[2].trim();
            if ((sv.startsWith('"') && sv.endsWith('"')) ||
                (sv.startsWith("'") && sv.endsWith("'"))) {
              sv = sv.slice(1, -1);
            }
            subKeys[subMatch[1]] = coerce(sv);
          }
          k++;
        }

        if (hasSubKeys) {
          // First line of block item may have a key: value too
          const firstKeyMatch = itemLine.match(/^(\w[\w_]*):\s*(.*)/);
          if (firstKeyMatch) {
            let fv = firstKeyMatch[2].trim();
            if ((fv.startsWith('"') && fv.endsWith('"')) ||
                (fv.startsWith("'") && fv.endsWith("'"))) {
              fv = fv.slice(1, -1);
            }
            subKeys[firstKeyMatch[1]] = coerce(fv);
          }
          items.push(subKeys);
          j = k;
        } else {
          items.push(coerce(itemLine));
          j++;
        }
      }

      if (items.length > 0) {
        result[key] = items;
        i = j;
        continue;
      }

      result[key] = '';
      i++;
      continue;
    }

    // Plain scalar
    result[key] = coerce(value);
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

function coerce(val) {
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val === 'null' || val === '~') return null;
  if (/^\d+$/.test(val)) return parseInt(val, 10);
  if (/^\d+\.\d+$/.test(val)) return parseFloat(val);
  return val;
}
