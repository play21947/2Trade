const express = require('express')
const cors = require('cors')
const mysql = require('mysql2')
const app = express()
const crypto = require('crypto')
const axios = require('axios')
const { getTime } = require('date-fns')
const clc = require('cli-color')


const dbcon = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bot'
})


app.use(express.json())
app.use(cors())



let error = clc.red.bold
let warn = clc.yellow
let pass = clc.green



const TS = () => {
    return new Promise((resolve, reject) => {
        axios.get("https://api.bitkub.com/api/servertime").then((res) => {
            resolve(res.data)
        })
    })
}

function signBody(body) {
    const digest = crypto.createHmac('sha256', '8d0cac54bd167c0eee0e3dce0d60b07a').update(JSON.stringify(body)).digest('hex');
    return digest;
}

const placeBid = (symbol, amount, rate, type) => { // BUY
    return new Promise(async (resolve, reject) => {
        try {
            let body = {
                sym: symbol,
                amt: amount, // THB no trailing zero 
                rat: rate, // for market order use 0
                typ: type,
                ts: Math.floor(getTime(new Date()) / 1000)
            };
            const signedBody = signBody(body);
            body.sig = signedBody;
            const response = await axios({
                method: 'post',
                url: 'https://api.bitkub.com/api/market/place-bid',
                headers: {
                    'Accept': 'application/json',
                    'Content-type': 'application/json',
                    'X-BTK-APIKEY': 'ab92d6af6744f46643072fb8bcd405a6'
                },
                data: body,
            }).then(res => resolve(res.data));;
        } catch (err) {
            reject(err);
        }
    });
}


function placeAsk(symbol, amount, rate, type) {
    return new Promise(async (resolve, reject) => {
        try {
            let body = {
                sym: symbol,
                amt: amount, // BTC no trailing zero 
                rat: rate, // for market order use 0
                typ: type,
                ts: Math.floor(getTime(new Date()) / 1000)
            };
            const signedBody = signBody(body);
            body.sig = signedBody;
            const response = await axios({
                method: 'post',
                url: 'https://api.bitkub.com/api/market/place-ask',
                headers: {
                    'Accept': 'application/json',
                    'Content-type': 'application/json',
                    'X-BTK-APIKEY': 'ab92d6af6744f46643072fb8bcd405a6'
                },
                data: body,
            }).then(res => resolve(res.data));;
        } catch (err) {
            reject(err);
        }
    });
}



// const getAllCoin = (coin) => {
//     return new Promise((resolve, reject) => {
//         try {
//             axios.get('https://api.bitkub.com/api/market/ticker?sym='+coin, {
//                 headers: {
//                     'Cache-Control': 'no-cache'
//                 }
//             }).then((res) => {
//                 resolve(res.data)
//             })
//         } catch (err) {
//             reject(err)
//         }
//     })
// }


const Info = (id, hash, sym_coin) => {
    return new Promise(async (resolve, reject) => {

        let body = {
            sym: sym_coin,
            id: id,
            sd: 'buy',
            hash: hash,
            ts: Math.floor(getTime(new Date()) / 1000),
        }


        let signed = signBody(body)

        body.sig = signed

        // console.log(body.sig)

        console.log("--Come Info--")

        let res = await axios({
            method: 'post',
            url: "https://api.bitkub.com/api/market/order-info",
            headers: {
                'X-BTK-APIKEY': 'ab92d6af6744f46643072fb8bcd405a6'
            },
            data: body
        }).then((res) => {
            resolve(res.data)
        })
    })
}


const GetWallet = (email) => {
    return new Promise((resolve, reject) => {
        try {
            axios.post("http://play2api.ddns.net:3001/api_btk", {
                email: email
            }).then((res) => {
                resolve(res.data)
            })
        } catch (err) {
            reject(err)
        }
    })
}


const TradeRemake = () => {
    let running = setInterval(() => {
        dbcon.query("SELECT * FROM market WHERE tradable = ?", [1], (err, rs) => {
            if (err) throw err

            rs.map((item) => {
                axios.get("https://api.bitkub.com/api/market/ticker?sym=" + item.sym_coin).then((res) => {

                    let Coin = Object.entries(res.data)

                    // console.log(Coin[0][1].last)

                    // console.log(Coin[0][0])

                    let percent = Coin[0][1].last / (item.total_money / item.total_coin)

                    let Start = item.start_price * (1 - (Math.abs(item.c1) / 100))

                    let percent_flex = item.trailling_stop * (1 - (item.flex / 100))

                    let percent_beta =  (((Coin[0][1].last * item.total_coin) / item.total_money) * 100) - 100

                    console.log(percent_beta)

                    // SELL

                    if(percent_beta >= item.take_profit){
                        if(item.sellable == 0){
                            dbcon.query("UPDATE market SET sellable = 1 WHERE email = ? AND sym_coin = ?", [item.email, item.sym_coin], (err, updateSellable)=>{
                                if(err) throw err
                            })
                        }else{

                            let decrease_price = item.tralling_stop - ((item.trailling_stop * item.flex) / 100)

                            if(Coin[0][1].last <= decrease_price){
                                // placeAsk()
                                // This Here Continue
                                dbcon.query("UPDATE market SET ")
                            }
                        }
                    }

                    // console.log(Coin)




                    // console.log("Start : ", Start)



                    // GetWallet(rs[0].email).then((wallet)=>{
                    //     let convert = Object.entries(wallet.result)

                    //     // console.log(item)

                    //     let split_word = item.sym_coin.split('THB_')[1]


                    //     let new_convert = convert.filter((specific)=>{
                    //         return specific[0] == split_word
                    //     })

                    //     console.log(new_convert[0][1])
                    // })


                    let result

                    if (percent < 0) {
                        result = (percent - 1) * 100
                    } else {
                        result = (percent * 100) - 100
                    }

                    // console.log(item.email ,' : ', percent)


                    // console.log(item.c1)
                    // console.log(item.c2)
                    // console.log(item.c3)


                    // *****Trailing Stop Update*****

                    // if (result >= item.take_profit) { // 11 >= 10 => 11
                    //     dbcon.query("UPDATE market SET trailling_stop = ?, status_sell = ? WHERE email = ? AND sym_coin = ?", [result, 1, item.email, item.sym_coin], (err, rs) => {
                    //         if (err) throw err

                    //         console.log(pass("Update Trailling Stop"))

                    //     })
                    // }


                    //***** SELL THIS HERE ******

                    // if (result <= percent_flex && item.status_sell == 1) {

                    //     GetWallet(rs[0].email).then((wallet) => {
                    //         let convert = Object.entries(wallet.result)

                    //         // console.log(item)

                    //         let split_word = item.sym_coin.split('THB_')[1]


                    //         let balance_coin = convert.filter((specific) => {
                    //             return specific[0] == split_word
                    //         })

                    //         placeAsk(item.sym_coin, balance_coin[0][1], 0, 'market').then((res) => {
                    //             console.log(res)

                    //             console.log(pass("----Watch Your Wallet----"))

                    //             console.log(pass("SELL! : ", item.sym_coin, ": ", balance_coin[0][1]))

                    //             let last_profit = balance_coin[0][1] * Coin[0][1].last


                    //             let profit_fee = last_profit * 0.9975

                    //             let finally_profit = (profit_fee - item.total_money)

                    //             dbcon.query("INSERT INTO log (email, sym_coin, side , rec_coin, price_buy_sell, investor_money, profit, last_profit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [item.email, item.sym_coin, "sell", balance_coin[0][1], Coin[0][1].last, item.total_money, last_profit, finally_profit], (err, log) => {
                    //                 if (err) throw err

                    //                 console.log(pass("|--INSERTED 'LOG'--|"))


                    //                 dbcon.query("SELECT * FROM history WHERE email = ? AND sym_coin = ?", [item.email, item.sym_coin], (err, history)=>{
                    //                     if(err) throw err

                    //                     if(history[0].length > 0){
                    //                         dbcon.query("SELECT SUM(last_profit) FROM log WHERE email = ? AND sym_coin = ?", [item.email, item.sym_coin], (err, sum)=>{
                    //                             if(err) throw err

                    //                             dbcon.query("UPDATE history SET profit = ? WHERE email = ? AND sym_coin = ?", [sum ,item.email, item.sym_coin], (err, historyUpdate)=>{
                    //                                 if(err) throw err
    
                    //                                 console.log(pass("--UPDATE HISTORY--"))

                    //                                 dbcon.query("UPDATE market SET total_money = ?, total_coin = ?, trailling_stop = ?, tradable = ?, bought = ?, s1 = ?, s2 = ?, s3 = ?, status_sell = ? WHERE email = ? AND sym_coin = ?", [0, 0, rs[0].take_profit, 0, 0, 0, 0, 0, 0, item.email, item.sym_coin], (err, rs5) => {
                    //                                     if (err) throw err
                
                    //                                     console.log(pass("RESET AND WAITING"))
                    //                                 })
                    //                             })
                    //                         })
                    //                     }else{
                    //                         dbcon.query("SELECT SUM(last_profit) FROM log WHERE email = ? AND sym_coin = ?", [item.email, item.sym_coin], (err, sum)=>{
                    //                             dbcon.query("INSERT INTO (email, sym_coin, profit) VALUES (? , ?, ?)", [item.email, item.sym_coin, sum], (err, historyInsert)=>{
                    //                                 if(err) throw err
                                                    
                    //                                 console.log(pass("--INSERT HISTORY--"))

                    //                                 dbcon.query("UPDATE market SET total_money = ?, total_coin = ?, trailling_stop = ?, tradable = ?, bought = ?, s1 = ?, s2 = ?, s3 = ?, status_sell = ? WHERE email = ? AND sym_coin = ?", [0, 0, rs[0].take_profit, 0, 0, 0, 0, 0, 0, item.email, item.sym_coin], (err, rs5) => {
                    //                                     if (err) throw err
                
                    //                                     console.log(pass("RESET AND WAITING"))
                    //                                 })
                    //                             })
                    //                         })
                    //                     }
                    //                 })


                    //                 // Actually That is in this here

                    //                 // dbcon.query("UPDATE market SET total_money = ?, total_coin = ?, trailling_stop = ?, tradable = ?, bought = ?, s1 = ?, s2 = ?, s3 = ?, status_sell = ? WHERE email = ? AND sym_coin = ?", [0, 0, rs[0].take_profit, 0, 0, 0, 0, 0, 0, item.email, item.sym_coin], (err, rs5) => {
                    //                 //     if (err) throw err

                    //                 //     console.log(pass("RESET AND WAITING"))
                    //                 // })
                    //             })

                    //         })

                    //     })

                    //     setTimeout(() => {
                    //         dbcon.query("UPDATE market SET start_price = ?, tradable = ? WHERE email = ? AND sym_coin = ?", [Coin[0][1].last, 1, item.email, item.sym_coin], (err, rs) => {
                    //             if (err) throw err

                    //             console.log(pass("Starting"))
                    //         })
                    //     }, item.timer)

                    //     // clearInterval(running)
                    // }

                    // placeBid(item.sym_coin, (item.investor_money * item.v1), Start, 'limit').then((res)=>{
                    //     console.log(res)
                    // })



                    // if (item.tradable == 1) {

                    //     console.log(Coin[0][1].last)

                    //     console.log("PercentFlex : ", percent_flex)

                    //     console.log(item.sym_coin, " : ", result)

                    //     console.log("Start PRice : ", Start)

                    //     let price_buy = Math.abs(((result / 100) - 1) * Coin[0][1].last)

                    //     // console.log(item.email, item.sym_coin ,result ,'<', item.c2)

                    //     // console.log(result <= item.c1 && result < item.c2)

                    //     if (Coin[0][1].last <= Start) { // 4.98 <= 5
                    //         if (item.s1 === 0 && item.bought == 0) {

                    //             if (item.order_id == 0 && !item.order_hash) {

                    //                 placeBid(item.sym_coin, (item.investor_money * item.v1), Start, 'limit').then((detail) => {
                    //                     dbcon.query("UPDATE market SET order_id = ?, order_hash = ?, temp_coin = ?, replace_coin = ? WHERE email = ? AND sym_coin = ?", [detail.result.id, detail.result.hash, detail.result.rec, detail.result.rec, item.email, item.sym_coin], (err, rs) => {
                    //                         if (err) throw err

                    //                         console.log(pass("-SET ORDER COVER 1-"))
                    //                     })
                    //                 })

                    //             } else {

                    //                 if (item.order_id && item.order_hash) {

                    //                     console.log("Order : ", item.order_id, item.order_hash)

                    //                     Info(item.order_id, item.order_hash, item.sym_coin).then((res) => {

                    //                         console.log("Order : ", res)

                    //                         let new_money = item.investor_money * item.v1

                    //                         let convert_coin = res.result.total / res.result.rate

                    //                         let AllCoin = item.total_coin + convert_coin


                    //                         if (res.result.status === 'filled') {

                    //                             console.log(pass("Filled"))

                    //                             dbcon.query("INSERT INTO log (email, sym_coin, side, rec_coin, price_buy_sell, investor_money) VALUES (?, ?, ?, ? ,?, ?)", [item.email, item.sym_coin, "buy_1", item.replace_coin, Coin[0][1].last, (item.investor_money * item.v1)], (err, log) => {
                    //                                 if (err) throw err

                    //                                 console.log(pass("|--INSERTED 'LOG'--|"))

                    //                                 // Then Inserted log

                    //                                 dbcon.query("UPDATE market SET total_money = ? ,total_coin = ?, bought = ?, order_id = ?, order_hash = ?, s1 = ? WHERE email = ? AND sym_coin = ?", [new_money, item.temp_coin, 1, 0, '', 1, item.email, item.sym_coin], (err, rs) => {
                    //                                     if (err) throw err

                    //                                     console.log(pass("UPDATE C1"))
                    //                                 })
                    //                             })


                    //                         }
                    //                     })
                    //                 } else {
                    //                     console.log(warn("Not Found Hash"))
                    //                 }
                    //             }




                    //         }
                    //     }

                    //     // console.log("Come Here")

                    //     // console.log(result <= item.c2)

                    //     if (result <= item.c2 && result > item.c3 && item.bought == 1) { // -2.5 <= -2 && -2.5 > -3

                    //         // DANGER COVER 2

                    //         console.log(pass("COME IN COVER 2"))


                    //         if (item.order_id == 0 && !item.order_hash) {

                    //             placeBid(item.sym_coin, (item.investor_money * item.v2), Coin[0][1].last, 'limit').then((detail) => {

                    //                 let old_temp_coin = item.temp_coin + detail.result.rec

                    //                 dbcon.query("UPDATE market SET order_id = ?, order_hash = ?, temp_coin = ?, replace_coin = ? WHERE email = ? AND sym_coin = ?", [detail.result.id, detail.result.hash, old_temp_coin, detail.result.rec, item.email, item.sym_coin], (err, rs) => {
                    //                     if (err) throw err

                    //                     console.log(pass("-SET ORDER COVER 2-"))
                    //                 })
                    //             })

                    //         } else {

                    //             Info(item.order_id, item.order_hash).then((res) => {

                    //                 let new_money2 = item.total_money + (item.investor_money * item.v2)

                    //                 let convert_coin = res.result.total / res.result.rate

                    //                 let AllCoin = item.total_coin + convert_coin


                    //                 if (res.result.status === 'filled') {

                    //                     console.log("Filled")


                    //                     dbcon.query("INSERT INTO log (email, sym_coin, side, rec_coin, price_buy_sell, investor_money) VALUES (?, ?, ?, ? ,?, ?)", [item.email, item.sym_coin, "buy_2", item.replace_coin, Coin[0][1].last, (item.investor_money * item.v2)], (err, log) => {
                    //                         if (err) throw err

                    //                         console.log(pass("|--INSERTED 'LOG'--|"))

                    //                         dbcon.query("UPDATE market SET total_money = ? ,total_coin = ?, bought = ?, s2 = ?, order_id = ?, order_hash = ? WHERE email = ? AND sym_coin = ?", [new_money2, item.temp_coin, 2, 1, 0, '', item.email, item.sym_coin], (err, rs) => {
                    //                             if (err) throw err

                    //                             console.log(pass('UPDATE C2'))
                    //                         })
                    //                     })
                    //                 }
                    //             })
                    //         }

                    //         // DANGER

                    //     } else if (result <= item.c3 && item.bought == 2) { // -3 < -30

                    //         console.log("Come In Cover 3")



                    //         // DANGER COVER 3

                    //         if (item.order_id == 0 && !item.order_hash) {

                    //             placeBid(item.sym_coin, (item.investor_money * item.v3), Coin[0][1].last, 'limit').then((detail) => {

                    //                 let old_temp_coin3 = item.temp_coin + detail.result.rec

                    //                 dbcon.query("UPDATE market SET order_id = ?, order_hash = ?, temp_coin = ?, replace_coin = ? WHERE email = ? AND sym_coin = ?", [detail.result.id, detail.result.hash, old_temp_coin3, detail.result.rec, item.email, item.sym_coin], (err, rs) => {
                    //                     if (err) throw err

                    //                     console.log(pass("-SET ORDER COVER 3-"))
                    //                 })
                    //             })

                    //         } else {

                    //             Info(item.order_id, item.order_hash).then((res) => {

                    //                 let new_money3 = item.total_money + (item.investor_money * item.v3)

                    //                 let convert_coin = res.result.total / res.result.rate

                    //                 let AllCoin = item.total_coin + convert_coin


                    //                 if (res.result.status === 'filled') {

                    //                     console.log("Filled")


                    //                     dbcon.query("INSERT INTO log (email, sym_coin, side, rec_coin, price_buy_sell, investor_money) VALUES (?, ?, ?, ? ,?, ?)", [item.email, item.sym_coin, "buy_3", item.replace_coin, Coin[0][1].last, (item.investor_money * item.v3)], (err, log) => {
                    //                         if (err) throw err

                    //                         console.log(pass("|--INSERTED 'LOG'--|"))

                    //                         dbcon.query("UPDATE market SET total_money = ? ,total_coin = ?, bought = ?, s3 = ?, order_id = ?, order_hash = ? WHERE email = ? AND sym_coin = ?", [new_money3, item.temp_coin, 3, 1, 0, '', item.email, item.sym_coin], (err, rs) => {
                    //                             if (err) throw err

                    //                             console.log(pass("UPDATE C3"))
                    //                         })
                    //                     })
                    //                 }
                    //             })
                    //         }
                            
                    //     }
                    // }


                })
            })
        })
    }, 1000)
}

TradeRemake()




// app.get('/cors', (req, res)=>{
//     res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
//     res.json("Cors is enabling")
// })

app.get('/test', (req, res) => {
    res.json({ status: true })
})


app.post('/user', async (req, res) => {

    let email = req.body.email

    let ts = await TS()

    dbcon.query("SELECT * FROM users WHERE email = ?", [email], (err, rs) => {
        if (err) throw err

        let sig = crypto.createHmac('sha256', rs[0].secret_key).update(JSON.stringify({ ts: ts })).digest('hex')

        res.json({ rs, signature: sig })
    })
})


app.post('/SignIn', (req, res) => {
    let email = req.body.email
    let password = req.body.password


    dbcon.query("SELECT * FROM users WHERE email = ? AND password = ?", [email, password], (err, rs) => {
        if (err) throw err


        console.log(rs.length)
        if (rs.length > 0) {
            res.json({ success: true })
        } else {
            res.json({ success: false })
        }
    })

})


app.post('/key', async (req, res) => {
    let apikey = req.body.apikey
    let secretkey = req.body.secretkey


    let ts = await TS()


    dbcon.query("UPDATE users SET api_key = ?, secret_key = ?", [apikey, secretkey], (err, rs) => {
        if (err) throw err

        res.json({ success: true })
    })
})

// app.post('/signature', (req, res)=>{

//     let email = req.body.email

//     dbcon.query("SELECT * FROM users WHERE email = ?", [email], (err, rs)=>{
//         if(err) throw err

//         console.log(rs[0].secretkey)
//     })
// })


app.post('/api_btk', async (req, res) => {

    let email = req.body.email

    let time = await axios.get('https://api.bitkub.com/api/servertime')


    dbcon.query("SELECT * FROM users WHERE email = ?", [email], (err, rs) => {
        if (err) throw err

        if (rs.length > 0) {
            let sig = crypto.createHmac('sha256', rs[0].api_secret).update(JSON.stringify({ ts: time.data })).digest('hex')

            if (sig) {
                axios.post('https://api.bitkub.com/api/market/wallet', {
                    ts: time.data,
                    sig: sig
                }, {
                    headers: {
                        'X-BTK-APIKEY': rs[0].api_key
                    }
                }).then((result) => {
                    res.json(result.data)
                })
            }
        }
    })

})


app.post('/update_market', (req, res) => {

    // percent_buy: percent_buy,
    // buy_point: buy_point,
    // percent_sell: percent_sell,
    // sell_point: sell_point

    let sym_coin = req.body.sym_coin
    let email = req.body.email
    let money = req.body.money
    let last_coin = req.body.last_coin
    let percent_buy = req.body.percent_buy
    let buy_point = req.body.buy_point
    let percent_sell = req.body.percent_sell
    let sell_point = req.body.sell_point


    console.log(percent_buy)


    dbcon.query("SELECT * FROM market WHERE sym_coin = ? AND email_holder = ?", [sym_coin, email], (err, rs) => {
        if (err) throw err

        console.log(rs.length)

        if (rs.length > 0) {
            dbcon.query("UPDATE market SET investor_money = ?, price_buy = ?, percent_buy = ?, buy_point = ?, percent_sell = ?, sell_point = ? WHERE sym_coin = ? AND email_holder = ?", [money, last_coin, percent_buy, buy_point, percent_sell, sell_point, sym_coin, email], (err, rs) => {
                if (err) throw err


                res.json({ success: true })
            })
        } else {
            dbcon.query("INSERT INTO market (email_holder, sym_coin, investor_money, price_buy, percent_buy, buy_point, percent_sell, sell_point) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [email, sym_coin, money, last_coin, percent_buy, buy_point, percent_sell, sell_point], (err, rs) => {
                if (err) throw err


                res.json({ success: true })
            })
        }
    })

    // dbcon.query("UPDATE market SET ")
})


app.post('/trade', (req, res) => {

    let email = req.body.email

    dbcon.query("SELECT * FROM market WHERE email = ?", [email], (err, rs) => {
        if (err) throw err

        res.json(rs)
    })
})


app.post("/get_coin", (req, res) => {

    let email = req.body.email
    let sym_coin = req.body.sym_coin

    dbcon.query("SELECT * FROM market WHERE email = ? AND sym_coin = ?", [email, sym_coin], (err, rs) => {
        if (err) throw err

        if (rs.length > 0) {
            res.json(rs)
        } else {
            res.json({ status: 'not found' })
        }

    })
})


app.post('/set_coin', (req, res) => {

    let email = req.body.email
    let sym_coin = req.body.sym_coin
    let last_price = Number(req.body.last_price) // Start Price
    let investor_money = Number(req.body.investor_money) // Total Money
    let price_buy = Number(req.body.price_buy)
    let c1 = -Math.abs(Number(req.body.c1)) // ไม้ 1
    let c2 = -Math.abs(Number(req.body.c2)) // ไม้ 2
    let c3 = -Math.abs(Number(req.body.c3)) // ไม้ 3
    let v1 = Number(req.body.v1) // martingel
    let v2 = Number(req.body.v2) // martingel
    let v3 = Number(req.body.v3) // martingel
    let take_profit = Number(req.body.take_profit) // Percent TP
    let flex = Number(req.body.flex) // Percent Flexible Value
    let timer = Number(req.body.timer) // loop then sell

    let minutes = timer * 60000

    dbcon.query("SELECT * FROM market WHERE email = ? AND sym_coin = ?", [email, sym_coin], (err, rs) => {
        if (err) throw err

        if (rs.length > 0) {
            // dbcon.query("UPDATE market SET start_price = ?, investor_money = ?, c1 = ?, c2 = ?, c3 = ?, v1 = ?, v2 = ?, v3 = ?, take_profit = ?, trailling_stop = ?, flex = ?, timer = ? WHERE email = ? AND sym_coin = ?", [last_price, investor_money, c1, c2, c3, v1, v2, v3, take_profit, take_profit, flex, minutes, email, sym_coin], (err, rs) => {
            //     if (err) throw err

            //     console.log(pass("--UPDATED THIS COIN--"))
            //     res.json({ updated: true })
            // })
            res.json({has_already: true})
        } else {
            dbcon.query("INSERT INTO market (email, sym_coin, start_price, total_money, total_coin, investor_money, c1, c2, c3, v1, v2, v3, take_profit, trailling_stop, flex, tradable, timer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [email, sym_coin, price_buy, 0, 0, investor_money, c1, c2, c3, v1, v2, v3, take_profit, 0, flex, 1, minutes], (err, rs) => {
                if (err) throw err

                console.log(pass("--INSERTED THIS COIN--"))
                res.json({ inserted: true })
            })
        }
    })
})


// app.post("/update_last", (req, res)=>{


//     let email = req.body.email

//     dbcon.query("SELECT * FROM market WHERE email = ?", [email], (err, rs)=>{
//         if(err) throw err

//         rs.map((item)=>{
//             axios.get('https://api.bitkub.com/api/market/ticker?sym='+item.sym_coin,{
//                 headers: {
//                     'Cache-Control': 'no-cache'
//                 }
//             }).then((res)=>{
//                 let convert = (Object.entries(res.data))

//                 console.log(convert)
//                 dbcon.query("UPDATE market SET last_price = ? WHERE email = ? AND sym_coin = ?", [convert[0][1].last, email, item.sym_coin], (err, result)=>{
//                     if(err) throw err

//                     console.log("---UPDATE LAST PRICE---")
//                 })
//             })
//         })
//     })

//     // dbcon.query("UPDATE market SET start_price = ?", )
// })



app.post("/toggle", (req, res) => {
    let status = req.body.status

    let email = req.body.email

    let sym_coin = req.body.sym_coin

    console.log("STATUS : ", status)


    dbcon.query("UPDATE market SET tradable = ? WHERE email = ? AND sym_coin = ?", [status, email, sym_coin], (err, rs) => {
        if (err) throw err

        res.json({ toggled: true })
    })
})



app.post('/user_data', (req, res) => {

    let email = req.body.email

    dbcon.query("SELECT * FROM users WHERE email = ?", [email], (err, rs) => {
        if (err) throw err

        res.json(rs)
    })
})


app.post("/history", (req, res) => {
    let email = req.body.email

    dbcon.query("SELECT * FROM history WHERE email = ? ORDER BY profit DESC", [email], (err, rs) => {
        if (err) throw err

        res.json(rs)
    })
})


app.post("/log", (req, res) => {
    let email = req.body.email

    dbcon.query("SELECT * FROM log WHERE email = ? ORDER BY id DESC", [email], (err, rs) => {
        if (err) throw err

        res.json(rs)
    })
})


app.post("/get_log", (req, res)=>{

    let email = req.body.email

    dbcon.query("SELECT * FROM log WHERE email = ? AND side = ?", [email, 'sell'], (err, rs)=>{
        if(err) throw err

        res.json(rs)
    })
})


app.listen(3001, () => {
    console.log('server is running on port 3001')
})