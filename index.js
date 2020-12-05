const express = require('express')
const axios = require('axios');
const bodyParser = require('body-parser')
const app = express()
const admin = require('firebase-admin');

const serviceAccount = require('./config/linebot-runner-firebase-adminsdk-nybvm-2de4d3c017.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

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
            let textArray = event.message.text;
            textArray = textArray.split(" ");
            console.log(textArray)
            if (textArray[0] === "step" || textArray[0] === "Step") {
                // step 10000
                let step = parseInt(textArray[1]);
                console.log(step)
                if (Number.isInteger(step)) {
                    quickConfirm(event.replyToken, step.toString(), "step");
                } else {
                    reply(event.replyToken, "กรุณากรอก `step จำนวนก้าว` ครับ");
                }
            } else if (textArray[0] === "add" || textArray[0] === "Add") {
                // add name
                quickConfirm(event.replyToken, textArray[1], "add")
            } else if (textArray[0] === "report" || textArray[0] === "Report") {
                reply(event.replyToken, textArray[0])
            }
            break;
        case 'postback':
            console.log(event.postback)
            let data = JSON.parse(event.postback.data)
            if (data.channel === 'step') {
                reply(event.replyToken, `วันที่ ${data.date} ได้ทำการบันทึกจำนวน ${data.step} ก้าวแล้ว`)
            } else if (data.channel === 'team') {
                console.log(event.postback.data)
                db.collection("runner").add(event.postback.data);
                reply(event.replyToken, `${data.team}ได้รับคุณ${data.name}เข้าทีมแล้ว`)
            }
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

const getTeam = (text_reply) => {
    const team_name = ['ทีมพี่พร', 'ทีมพี่กมล', 'ทีมพี่ปุ้ม', 'ทีมพี่เล็ก', 'ทีมพี่ตั้ว', 'ทีมพี่เอ้']
    let all_team_json = [];
    team_name.forEach(name => {
        all_team_json.push({
            type: "action",
            action: {
                type: "postback",
                label: `${name}`,
                data: JSON.stringify({
                    team: `${name}`,
                    name: text_reply,
                    channel: "team"
                }),
                displayText: `ขอเข้า${name}หน่อยนะ`
            }
        })
    });

    return all_team_json;
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

const quickConfirm = (to, text_reply, channel) => {
    let quick_item, quick_ask
    if (channel === 'step') {
        quick_ask = `คุณต้องการให้บันทึก ${text_reply} ก้าวของวันไหน?`
        quick_item = {
            items: [
                {
                    type: "action",
                    action: {
                        type: "postback",
                        label: "วันนี้",
                        data: JSON.stringify({
                            date: `${callDate("วันนี้")}`,
                            step: text_reply,
                            channel: channel,
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
                            channel: channel,
                        }),
                        displayText: "นับก้าวของเมื่อวาน"
                    }
                },
            ]
        }
    } else if (channel === 'add') {
        quick_ask = `คุณ ${text_reply} ต้องการขอเข้าทีมไหนครับ`
        quick_item = {
            items: getTeam(text_reply)
        }
    }


    return axios({
        method: "post",
        url: `${LINE_MESSAGING_API}/reply`,
        headers: LINE_HEADER,
        data: JSON.stringify({
            replyToken: to,
            messages: [
                {
                    type: "text",
                    text: quick_ask,
                    quickReply: quick_item
                }
            ]
        })
    })
};


app.listen(PORT)
