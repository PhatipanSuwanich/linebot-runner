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
const moment = require('moment-timezone');
moment.locale('th')

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.post('/lineBot', (req, res) => {
    console.log(req.body)
    let event = req.body.events[0];
    switch (event.type) {
        case 'message':
            // วันนี้ บันทึก 10000
            // เมื่อวาน บันทึก 10000
            let textArray = event.message.text;
            textArray = textArray.split(" ");
            console.log(textArray)
            if (textArray[1] === "บันทึก") {
                saveStep(event.replyToken, textArray[2], textArray[0]);
            } else if (textArray[0].startsWith("สรุปผล")) {
                reply(event.replyToken, textArray[0])
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

const saveStep = (to, text_reply, date) => {
    let timer = moment().tz("Asia/Bangkok");
    console.log(timer.format('DD MM YYYY'))
    if (date === "เมื่อวาน") {
        timer.subtract(1, 'days').calendar();
    } else if (date === "วันนี้") {
        timer.calendar();
    }
    console.log(timer)
    console.log(timer.format('DD MM YYYY'))

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
