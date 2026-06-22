import nodemailer from 'nodemailer';
const t = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  secure: false,
  auth: { user: 'uch7zxbafllpfqls@ethereal.email', pass: 't9smSHKZNPAQhVvJK2' }
});
try {
  const i = await t.sendMail({
    from: '"Lumiere" <uch7zxbafllpfqls@ethereal.email>',
    to: 'uch7zxbafllpfqls@ethereal.email',
    subject: 'SMTP Test',
    text: 'Testing SMTP'
  });
  console.log('OK:', i.messageId);
  console.log('Preview:', nodemailer.getTestMessageUrl(i));
} catch(e) {
  console.error('FAIL:', e.message);
}
