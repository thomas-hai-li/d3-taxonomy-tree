require("dotenv").config();
const express = require("express"),
    bodyParser = require("body-parser"),
    exphbs = require("express-handlebars"),
    nodemailer = require("nodemailer");
const app = express();
const PORT = process.env.PORT || 1337;

// Static folder
app.use(express.static('public'));
// View engine
// app.engine("handlebars", exphbs());
// app.set("view engine", "html");
// Body parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/", (req, res) => {
    res.render(index.html);
});

app.post("/feedback", (req, res) => {
    let name = req.body.name,
        organization = req.body.organization,
        comments = req.body.comments;
    if (!name) { name = "not provided" };
    if (!organization) { organization = "not provided" };
    const toSend = `
        <h4>Details:</h4>
        <p>Name: ${name}</p>
        <p>Organization: ${organization}</p>
        <p>Comments: ${comments}</p>
    `;
    
    let transporter = nodemailer.createTransport({
        service: "Mailgun",
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD
        }
    });

    let mailOptions = {
        from: '"Polar Foo 🐼" <foobear@superpolarfoo.com>',
        to: "limera2nn@gmail.com",
        subject: "New Feedback!",
        text: "blah",
        html: toSend
    }

    transporter.sendMail(mailOptions, (err, data) => {
        if (err) {
            console.log(err);
        }
        else {
            console.log("Message sent: %s", info.messageId);
            console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        }
    });
});

app.listen(PORT, () => console.log(`Listening on ${ PORT }`));
