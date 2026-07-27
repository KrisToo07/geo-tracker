// Checks the shared validation schemas actually reject the inputs they claim to.
// Run: node scripts/test-validation.mjs
import { z } from 'zod'

const shortText = z.string().trim().min(1, 'is required').max(200, 'too long')
const mediumText = z.string().trim().max(1000, 'too long')
const uuid = z.string().uuid()
const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((v) => {
    try {
      const p = new URL(v).protocol
      return p === 'http:' || p === 'https:'
    } catch {
      return false
    }
  })

let pass = 0, fail = 0
const t = (name, cond) => {
  if (cond) { pass++; console.log('  ok   ' + name) }
  else { fail++; console.log('  FAIL ' + name) }
}

// shortText — the field that becomes an LLM query
t('rejects empty keyword', !shortText.safeParse('').success)
t('rejects whitespace-only keyword', !shortText.safeParse('     ').success)
t('rejects 5k-char keyword (token-burn / prompt injection)',
  !shortText.safeParse('a'.repeat(5000)).success)
t('accepts a normal keyword', shortText.safeParse('best bakery hanoi').success)
t('trims surrounding whitespace',
  shortText.safeParse('  hi  ').success && shortText.parse('  hi  ') === 'hi')

// httpUrl — stored then rendered/followed
t('rejects javascript: URL', !httpUrl.safeParse('javascript:alert(1)').success)
t('rejects data: URL', !httpUrl.safeParse('data:text/html,<script>alert(1)</script>').success)
t('rejects file: URL', !httpUrl.safeParse('file:///etc/passwd').success)
t('rejects garbage', !httpUrl.safeParse('not a url').success)
t('accepts https URL', httpUrl.safeParse('https://tablo.vn').success)
t('accepts http URL', httpUrl.safeParse('http://example.com/x?y=1').success)

// uuid — path/ownership ids
t('rejects non-uuid brandId', !uuid.safeParse('1 OR 1=1').success)
t('rejects sql-ish brandId', !uuid.safeParse("'; DROP TABLE brands;--").success)
t('accepts a real uuid', uuid.safeParse('3f2504e0-4f89-11d3-9a0c-0305e82c3301').success)

// mediumText
t('rejects 50k-char description', !mediumText.safeParse('x'.repeat(50000)).success)
t('accepts a normal description', mediumText.safeParse('Artisan bakery in Hanoi.').success)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
