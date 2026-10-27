const fs = require('node:fs');

for (const directory of ['lib', 'reports', 'test-results']) {
  fs.rmSync(directory, { recursive: true, force: true });
}
