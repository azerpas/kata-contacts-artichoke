const sqlite3 = require('sqlite3')
const open = require('sqlite').open
const fs = require('fs')

if (process.argv.length < 3) {
  console.error('Usage: node index.js <numContacts>')
  process.exit(1)
}

const filename = 'contacts.sqlite3'
const numContacts = process.argv[2]

const shouldMigrate = !fs.existsSync(filename)

/**
 * Generate `numContacts` contacts,
 * one at a time
 *
 */
function * generateContacts (numContacts) {
 // TODO
  let i = 1
  while (i <= numContacts) {
    yield [`name-${i}`, `email-${i}@domain.tld`]
    i++
  }
}

const migrate = async (db) => {
  console.log('Migrating db ...')
  await db.exec(`
        CREATE TABLE contacts(
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL
         )
     `)
  await db.exec("CREATE UNIQUE INDEX index_contacts_email ON contacts(email);");
  console.log('Done migrating db')
}

const insertContacts = async (db) => {
  console.log('Inserting contacts ...')
  const timeInMsBeforeInsert = Date.now()
  await db.exec('BEGIN TRANSACTION')
  const stmt = await db.prepare('INSERT INTO contacts (name, email) VALUES (?, ?)')
  for (const contact of generateContacts(numContacts)) {
    await stmt.run(contact)
  }
  await stmt.finalize()
  await db.exec('COMMIT')
  const timeInMsAfterInsert = Date.now()
  console.log(`Done inserting ${numContacts} contacts in ${timeInMsAfterInsert - timeInMsBeforeInsert} ms`)
}

const queryContact = async (db) => {
  const start = Date.now()
  const res = await db.get('SELECT name FROM contacts WHERE email = ?', [`email-${numContacts}@domain.tld`])
  if (!res || !res.name) {
    console.error('Contact not found')
    process.exit(1)
  }
  const end = Date.now()
  const elapsed = (end - start) / 1000
  console.log(`Query took ${elapsed} seconds`)
}

(async () => {
  const db = await open({
    filename,
    driver: sqlite3.Database
  })
  if (shouldMigrate) {
    await migrate(db)
  }
  await insertContacts(db)
  await queryContact(db)
  await db.close()
})()
