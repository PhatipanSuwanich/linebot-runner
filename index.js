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
    // console.log(req.body)
    let event = req.body.events[0];
    console.log(event.source)
    switch (event.type) {
        case 'message':
            // step 10000
            let textArray = event.message.text;
            textArray = textArray.split(" ");
            console.log(textArray)
            if (textArray[0] === "step" || textArray[0] === "Step") {
                let step = parseInt(textArray[1]);
                console.log(step)
                if (Number.isInteger(step)) {
                    console.log(Number.isInteger(step))
                    quickConfirm(event.replyToken, textArray[1]);
                } else {
                    reply(event.replyToken, "กรุณากรอก `step จำนวนก้าว` ครับ");
                }
            } else if (textArray[0].startsWith("สรุปผล")) {
                console.log(step)
                reply(event.replyToken, textArray[0])
            }
            break;
        case 'postback':
            console.log(event.postback)
            let data = JSON.parse(event.postback.data)
            reply(event.replyToken, `วันที่ ${data.date} ได้ทำการบันทึกจำนวน ${data.step} ก้าวแล้ว`)
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

const callDate = (date) => {
    let timer = moment().tz("Asia/Bangkok");
    if (date === "เมื่อวาน") {
        timer.subtract(1, 'days').calendar();
    } else if (date === "วันนี้") {
        timer.calendar();
    }

    return `${timer.format('DD/MM/YYYY')}`
};

const confirmMessage = (to, text_reply) => {
    return axios({
        method: "post",
        url: `${LINE_MESSAGING_API}/reply`,
        headers: LINE_HEADER,
        data: JSON.stringify({
            replyToken: to,
            messages: [
                {
                    type: "template",
                    altText: "This is a confirm template",
                    template: {
                        type: "confirm",
                        text: `คุณต้องการให้บันทึก ${text_reply} ก้าวของวันไหน?`,
                        actions: [
                            {
                                type: "postback",
                                label: "วันนี้",
                                data: JSON.stringify({
                                    date: `${callDate("วันนี้")}`,
                                    step: text_reply,
                                }),
                                displayText: "บันทึกวันนี้"
                            },
                            {
                                type: "postback",
                                label: "เมื่อวาน",
                                data: JSON.stringify({
                                    date: `${callDate("เมื่อวาน")}`,
                                    step: text_reply,
                                }),
                                displayText: "บันทึกเมื่อวาน"
                            }
                        ]
                    }
                }
            ]
        })
    })
};

const quickConfirm = (to, text_reply) => {
    return axios({
        method: "post",
        url: `${LINE_MESSAGING_API}/reply`,
        headers: LINE_HEADER,
        data: JSON.stringify({
            replyToken: to,
            messages: [
                {
                    type: "text",
                    text: `คุณต้องการให้บันทึก ${text_reply} ก้าวของวันไหน?`,
                    quickReply: {
                        items: [
                            {
                                type: "action",
                                action: {
                                    type: "postback",
                                    label: "วันนี้",
                                    data: JSON.stringify({
                                        date: `${callDate("วันนี้")}`,
                                        step: text_reply,
                                    }),
                                    displayText: "นับก้าวของวันนี้"
                                }
                            },
                            {
                                type: "action",
                                action: {
                                    type: "postback",
                                    label: "เมื่อวาน",
                                    data: JSON.stringify({
                                        date: `${callDate("เมื่อวาน")}`,
                                        step: text_reply,
                                    }),
                                    displayText: "นับก้าวของเมื่อวาน"
                                }
                            },
                        ]
                    }
                }
            ]
        })
    })
};


app.listen(PORT)
