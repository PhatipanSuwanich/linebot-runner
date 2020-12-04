const express = require('express')
const axios = require('axios');
const bodyParser = require('body-parser')
const app = express()

const PORT = process.env.PORT || 8080

const LINE_MESSAGING_API = 'https://api.line.me/v2/bot/message';
const LINE_HEADER = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer 7MxMoId+Cf9MJNaQr+YMexcez9Q/5+SLjHpCOmMhnDGI4nLKQGiz/Ch7cVSf6VYn+/Mgqc7UA4bysVs8qIFT+Qi5oWWZZpoi6p4Wr+CEx3c0575W+ksZ5ssBfZPMerTWl0LIRmtC/QyyzOFaGCbJLAdB04t89/1O/w1cDnyilFU=`
};
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.post('/lineBot', (req, res) => {
    console.log(req.body)
    let event = req.body.events[0];
    switch (event.type) {
        case 'text':
            let callbot = event.message.text;
            if (callbot.startsWith("bot")) {
                let text = callbot.replace("bot ", "")
                console.log(text)
                reply(event.replyToken, text);
            } else if (callbot.startsWith("บอต")) {
                let text = callbot.replace("บอต ", "")
                console.log(text)
                reply(event.replyToken, text);
            }
            break;
        default:
            break;
    }
    res.sendStatus(200)
})

const reply = (to, text_reply) => {
    return axios({
        method: 'post',
        url: `${LINE_MESSAGING_API}/reply`,
        headers: LINE_HEADER,
        data: JSON.stringify({
            replyToken: to,
            messages: [
                {
                    type: `text`,
                    text: text_reply
                }
            ]
        })
    });
};


app.listen(PORT)
