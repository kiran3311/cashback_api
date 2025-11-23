const sgMail = require('@sendgrid/mail');
const functions = require('firebase-functions');

//sgMail.setApiKey(functions.config().sendgrid.key);

sgMail.setApiKey("SG.TWAFVP65NF3KLUQTQPANM2NT");

exports.sendInviteEmail_2 = async (email, subject, message) => {
  const msg = {
    to: email,
    from: 'thodakamkaro@gmail.com', 
    subject: subject,
    html: message,
  };

  try {
    await sgMail.send(msg);
    console.log("Email sent successfully");
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    if (error.response) {
      console.error(error.response.body);
    }
    return false;
  }
};
