import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { prepareEmail, sendEmail } from '../lib/email.js';

try {
  const { values } = parseArgs({ options: {
    to: { type: 'string' }, subject: { type: 'string' }, file: { type: 'string' },
    send: { type: 'boolean', default: false }
  } });
  if (!values.file) throw new Error('Usage: npm run email -- --to person@example.com --subject "DataJam update" --file message.txt [--send]');
  const message = { to: values.to, subject: values.subject, text: await readFile(values.file, 'utf8') };
  const preview = prepareEmail(message);
  if (!values.send) {
    console.log(JSON.stringify(preview, null, 2));
    console.log('Preview only. Add --send to send this email.');
  } else {
    console.log(`Accepted by Brevo: ${await sendEmail(message)}. Check Brevo logs for delivery status.`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
