'use strict'

plugin.info = {
  name: "Message Linkedin",
  chat,
  sayOnStart: task => pickOne(startChats(task)),
  sayOnEnd: task => pickOne(doneChats(task)),
}

function chat(task, status) {
  if(status.code == 102) return pickOne(startChats(task))
  if(status.code == 200) return pickOne(doneChats(task))
}

function startChats(task) {
  const user = getUser(task)
  return [
    `Sending a message to ${user}`,
    `Messaging ${user} on LinkedIn`,
  ]
}

function doneChats(task) {
  const user = getUser(task)
  return [
    `Sent message to ${user}`,
    `Messaged ${user}! Hopefully that should help us connect...`,
    `Messaged ${user}! Hopefully we'll get a reply soon...`,
    `Done! Finger's crossed ${user} will reply soon...`,
  ]
}

function getUser(task) {
  if(!task.linkedInURL) return "(MISSING USER URL!)"
  let n = task.linkedInURL.split('/').filter(v => v)
  return n[n.length-1]
}

function pickOne(a) {
  return a[Math.floor(Math.random()*a.length)]
}

async function performTask(task) {
  await page.goto(task.linkedInURL)
  try {
    await page.waitFor('input[role=combobox]')
  } catch(e) {
    try {
      await page.waitFor('[data-resource="feed/badge"]')
    } catch(e) {
      await page.waitFor(2000)
    }
  }
  const name = await getnametext(page)
  if(!name) {
    status.servererr("Failed to find user name!")
    return
  }
  await page.goto('https://www.linkedin.com/messaging/')
  await page.waitFor(5000)
  const convlist = await page.evaluate(()=>{
    const msgcont = document.querySelectorAll('h3.msg-conversation-listitem__participant-names')
    let leadlist = []
    for(let i = 0;i<msgcont.length;i++){
      let msgUsers = msgcont[i].innerText
      leadlist.push(msgUsers)
    }
    return leadlist
  })
  const idx = convlist.indexOf(name)
  if(idx !== -1) {
    await page.evaluate((idx)=>{
      let recipients = document.querySelectorAll('h3.msg-conversation-listitem__participant-names')
      recipients[idx].click()
    },idx)
    await page.waitFor(5000)
    const msgList = await page.evaluate(()=>{
      const msgs = document.querySelectorAll(".msg-s-event-listitem__body")
      let msg_list = []
      for (let j =0;j<msgs.length;j++){
        msg_list.push(msgs[j].innerText)
      }
      return msg_list
    })
    for (let k =0;k<msgList.length;k++){
      if(util.compareTwoStrings(msgList[k].toLowerCase(), task.message.toLowerCase()) > 0.9) {
        status.usererr(`(${task.message}) This msg was already sent.`)
        return
      }
    }
  }

  await page.goto(task.linkedInURL)
  try {
    await page.waitFor('input[role=combobox]')
  } catch(e) {
    try {
      await page.waitFor('[data-resource="feed/badge"]')
    } catch(e) {
      await page.waitFor(2000)
    }
  }
  await page.evaluate(async () => {
    const as = document.getElementsByTagName('a')
    let found
    for(let i = 0;i < as.length;i++) {
      let curr = as[i]
      if(curr.href
        && curr.href.match(/messaging\/thread\/.*compose_message_button/)) {
        found = curr
        break
      }
    }
    if(!found) throw('Failed to find message button')
    found.click()
  })
  const msgbox_sel = 'div.msg-form__contenteditable[contenteditable=true]'
  await page.waitFor(msgbox_sel)
  await page.type(msgbox_sel, task.message)
  await page.click('button.msg-form__send-button')
  await page.waitFor(2000)
  status.done()
}

// Get the name element 
async function getnametext(page){
  let nametext
  try
  {
    await page.waitForSelector(".inline.t-24.t-black.t-normal.break-words")
    nametext = await page.evaluate(()=>{
      return document.querySelector('.inline.t-24.t-black.t-normal.break-words').innerText 
    })
  }catch(e){
    await page.waitForSelector(".text-heading-xlarge")
    nametext = await page.evaluate(()=>{
      return document.querySelector('.text-heading-xlarge').innerText 
    })
  }
 return nametext
}