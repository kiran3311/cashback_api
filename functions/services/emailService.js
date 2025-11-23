const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "thodakamkaro@gmail.com",
    pass: "gnqzfqtovvjuvgzz",
  },
});

exports.sendInviteEmail = async (to, name) => {
  const html = `
    <h3>Hello ${name},</h3>
    <p>You have been invited to join our Cashback App.</p>
    <p><a href="https://your-app-link.com/register">Click here to register</a></p>
  `;

  return transporter.sendMail({
    from: "thodakamkaro@gmail.com",
    to,
    subject: "You're invited to the Cashback App",
    html,
  });
};
