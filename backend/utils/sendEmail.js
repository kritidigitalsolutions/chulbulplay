const nodemailer = require(
  "nodemailer"
);


const emailUser = process.env.EMAIL_USER || process.env.EMAIL;
const emailPass = process.env.EMAIL_PASS;

// create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: emailUser,
    pass: emailPass,
  },
});

// send email function
const sendEmail = async (to, subject, text) => {
  if (!emailUser || !emailPass) {
    console.log(`📧 [EMAIL MOCK] To: ${to} | Subject: ${subject} | Body: ${text}`);
    return;
  }

  await transporter.sendMail({
    from: emailUser,
    to,
    subject,
    text,
  });
};


module.exports = sendEmail;