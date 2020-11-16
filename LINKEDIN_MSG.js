'use strict'

plugin.info = {
  name: "Message Linkedin",
  sayOnStart: task => pickOne(startChats(task)),
  sayOnEnd: task => pickOne(doneChats(task)),
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
    } catch(e) {}
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
  await page.type(msgbox_sel, msg)

  await page.click('button.msg-form__send-button')
  status.done()
}
