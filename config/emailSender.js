const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'anjananjana8@gmail.com', 
    pass: 'ufoh xhkr hnji nytv'
  }
});
module.exports = transporter;
