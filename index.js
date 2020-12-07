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

app.post('/lineBot', async (req, res) => {
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
                const runnerRef = db.collection('runner').doc(event.source.userId);
                const runnerDoc = await runnerRef.get();
                if (runnerDoc.exists) {
                    reply(event.replyToken, 'คุณเคยลงทะเบียนเป็นนักวิ่งแล้ว');
                } else {
                    // add name
                    quickConfirm(event.replyToken, textArray[1], "add")
                }
            } else if (textArray[0] === "report" || textArray[0] === "Report") {
                // report past
                let text_date;
                if (textArray[1] === undefined) {
                    text_date = "วันนี้"
                } else if (textArray[1] === "past") {
                    text_date = "เมื่อวาน"
                } else {
                    reply(event.replyToken, "กรุณากรอก `report past` เพื่อดูรายงานทุกทีมของเมื่อวานครับ");
                }
                console.log(text_date)
                getReport(text_date, event)
            } else if (textArray[0] === "myteam" || textArray[0] === "Myteam") {
                // myteam past
                let text_date;
                if (textArray[1] === undefined) {
                    text_date = "วันนี้"
                } else if (textArray[1] === "past") {
                    text_date = "เมื่อวาน"
                } else {
                    reply(event.replyToken, "กรุณากรอก `myteam past` เพื่อดูจำนวนก้าวของเมื่อวานครับ");
                }
                getTeamReport(text_date, event)
            }
            break;
        case 'postback':
            console.log(event.postback)
            let data = JSON.parse(event.postback.data)
            if (data.channel === 'step') {
                await addToCounting(data, event)
            } else if (data.channel === 'team') {
                console.log(event.postback.data)
                db.collection("runner").doc(event.source.userId).set({
                    team: data.team,
                    name: data.name,
                    line: event.source.userId,
                }).then(function () {
                    reply(event.replyToken, `${data.team}ได้รับคุณ${data.name}เข้าทีมแล้ว`)
                }).catch(err => {
                    console.log(err)
                    reply(event.replyToken, 'การบันทึกมีปัญหา');
                });
            }
        default:
            break;
    }
    res.sendStatus(200)
})

const getReport = async (text_date, event) => {
    return axios({
        method: "post",
        url: `${LINE_MESSAGING_API}/reply`,
        headers: LINE_HEADER,
        data: JSON.stringify({
            replyToken: event.replyToken,
            messages: [{
                type: "flex",
                altText: "Report Step",
                contents: await getAllteam(text_date)
            }]
        })
    })
}

const addToCounting = async (data, event) => {
    const runnerRef = db.collection('runner').doc(event.source.userId);
    const doc = await runnerRef.get();
    if (!doc.exists) {
        reply(event.replyToken, 'คุณยังไม่ได้ทำการลงทะเบียนเป็นนักวิ่ง');
    } else {
        console.log('Document data:', doc.data());
        let runner_db = doc.data();

        const countingSnapshot = await db.collection('counting').where('name', '==', runner_db.name).where('date', '==', callDate(data.date)).get();
        if (countingSnapshot.empty) {
            db.collection("counting").add({
                date: callDate(data.date),
                step: data.step,
                team: runner_db.team,
                name: runner_db.name,
            }).then(function () {
                getTeamReport(data.date, event)
            }).catch(err => {
                console.log(err)
                reply(event.replyToken, 'การบันทึกมีปัญหา');
            });
        } else {
            countingSnapshot.forEach((doc) => {
                console.log(doc.id, ' => ', doc.data())
                db.collection("counting").doc(doc.id).set({
                    date: callDate(data.date),
                    step: data.step,
                }).then(function () {
                    getTeamReport(data.date, event)
                }).catch(err => {
                    console.log(err)
                    reply(event.replyToken, 'การบันทึกมีปัญหา');
                });
            });
        }
    }

    return true
};

const getTeamReport = async (text_date, event) => {
    const runnerRef = db.collection('runner').doc(event.source.userId);
    const doc = await runnerRef.get();
    if (!doc.exists) {
        reply(event.replyToken, 'คุณยังไม่ได้ทำการลงทะเบียนเป็นนักวิ่ง');
    } else {
        console.log('Document data:', doc.data());
        let runner_db = doc.data();
        let text_reply = `วันที่ ${callDate(text_date)}\n`;
        let sum_step = 0.00, round = 0;
        const querySnapshot = await db.collection('counting').where('team', '==', runner_db.team).where('date', '==', callDate(text_date)).get();
        querySnapshot.forEach((doc) => {
            console.log(doc.id, ' => ', doc.data())
            let step = parseFloat(doc.data().step)
            sum_step += step
            text_reply += `${doc.data().name} เดินไป ${doc.data().step} ก้าว\n`
            round += 1;
        });
        let average = sum_step / round;
        if (isNaN(average)) {
            average = 0
        } else if (average > 10000) {
            average = 10000
        }
        text_reply += `เฉลี่ย${runner_db.team}เดินไป ${average} ก้าว`
        await addToTeamReport(text_date, runner_db.team, average)
        reply(event.replyToken, text_reply)
    }
}

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

const addToTeamReport = (text_date, team_name, average) => {
    db.collection("team").add({
        date: callDate(text_date),
        name: team_name,
        sum_step: average,
    }).then(function () {
        return true;
    }).catch(err => {
        console.log(err)
        return false
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

const getAllteam = async (text_date) => {
    let all_team_json = [];
    const teamRef = db.collection('team')
    const teamRes = await teamRef.where('date', '==', callDate(text_date)).get();
    teamRes.forEach((doc) => {
        console.log(doc.id, ' => ', doc.data())
        all_team_json.push({
            type: "box",
            layout: "baseline",
            contents: [
                {
                    type: "text",
                    text: `${doc.data().name}`,
                    weight: "bold",
                    flex: 0,
                    margin: "sm"
                },
                {
                    type: "text",
                    text: `${doc.data().sum_step} ก้าว`,
                    size: "sm",
                    color: "#AAAAAA",
                    align: "end"
                }
            ]
        })
    });

    let json = {
        type: "bubble",
        direction: "ltr",
        body: {
            type: "box",
            layout: "vertical",
            spacing: "md",
            contents: [
                {
                    type: "text",
                    text: `สรุปผลวันที่ ${callDate("เมื่อวาน")}`,
                    weight: "bold",
                    size: "xl",
                },
                {
                    type: "box",
                    layout: "vertical",
                    spacing: "sm",
                    contents: all_team_json
                }
            ]
        }
    }

    return json;
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
                                    date: "วันนี้",
                                    step: text_reply,
                                }),
                                displayText: "บันทึกวันนี้"
                            },
                            {
                                type: "postback",
                                label: "เมื่อวาน",
                                data: JSON.stringify({
                                    date: "เมื่อวาน",
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
