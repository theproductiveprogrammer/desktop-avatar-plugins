'use strict'

plugin.info = {
  name: "Linkedin Check Message",
  chat,
  sayOnStart: task => pickOne(startChats(task)),
  sayOnEnd: task => pickOne(doneChats(task)),
}

function chat(task, status) {
  if(status.code == 102) return pickOne(startChats(task))
  if(status.code == 200) {
    if(status.notify === "event/inmsg-response") {
      return pickOne(respondedChats(task))
    } else {
      return pickOne(doneChats(task))
    }
  }
}

function startChats(task) {
  const user = getUser(task)
  return [
    `Checking if any reply from ${user}`,
    `${user} has replied or not? Lets Check`,
    `Checking if ${user} is has replied to us yet...`,
  ]
}

function doneChats(task) {
  const user = getUser(task)
  return [
    `Finished checking for replies from ${user}`,
    `${user} has not replied yet...`,
    `Done checking - no reply from ${user} yet`,
    `Completed checking - ${user} has yet to reply`,
  ]
}

function respondedChats(task) {
  const user = getUser(task)
  return [
    `Yay! ${user} has replied`,
    `Our message got a response from ${user}!`,
    `Our message was replied to by ${user}!`,
    `${user} has replied to our message!`,
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
    }catch(e) {
      await page.waitFor(2000)
    }
  }
  let name = await page.evaluate(()=>{
    const e = document.querySelector('li.inline.t-24.t-black.t-normal.break-words')
    return e ? e.innerText : null
  })

  await page.goto('https://www.linkedin.com/messaging/')

  if(name) {
    // Narrowing down the conversations with searching for Lead Name 
    await page.waitFor('a[data-control-name=view_message]')
    await page.type("#search-conversations",name)
    await page.keyboard.press(String.fromCharCode(13))
    try{
      // Waiting for NO CONVERSATION element 
      await page.waitForSelector("p.mb4")
      status.done()
      return
    }catch(e){
      // Failed to narrow down the search? Never mind, let's just
      // continue
    }
  }

  // Proceeding with iterating through all/narrowed conversations
  await page.waitFor('a[data-control-name=view_message]')
  const msgs = await page.evaluate(async () => {
    const cont = document.getElementsByClassName('msg-conversations-container')[0]
    const msgs = cont.querySelectorAll('a[data-control-name=view_message]')
    let hrefs = []
    for(let i = 0;i < msgs.length;i++) {
      hrefs.push(msgs[i].href)
    }
    return hrefs
  })
  for(let i = 0;i < msgs.length;i++) {
    await page.goto(msgs[i])
    await page.waitFor('a[data-control-name=view_profile]')
    const response = await page.evaluate(url => {
      const thread = document.getElementsByClassName('msg-thread')[0]
      const msgListContent = thread.getElementsByClassName('msg-s-message-list-content')[0]
      const msgList = msgListContent.getElementsByClassName('msg-s-message-list__event')
      let msgurl
      for(let i = 0;i < msgList.length;i++) {
        try{
          msgurl = msgList[i].querySelector('a[data-control-name=view_profile]').href
        }catch(e){
          // Ignore when chats doesnt have urls
        }
        if(msgurl){
          if(urleq(msgList[i].querySelector('a[data-control-name=view_profile]').href, url)) {
            return {
              responded: true,
              msg: msgList[i].getElementsByClassName('msg-s-event-listitem__body')[0].innerText
            }
          }
        }
      }

      /*    way/
       * Compare the two URL paths by normalizing them
       */
      function urleq(url1, url2){
        if (!url1 || !url2) return false
        return norm_1(url1) === norm_1(url2)
      }

      /*    way/
       * if the url is a full url, get the path portion, otherwise
       * assume it is a path url and standardize the starting and
       * trailing slashes
       */
      function norm_1(url) {
        try {
          url = new URL(url).pathname
        } catch(e) {}
        if(!url.endsWith("/")) url += "/"
        if(!url.startsWith("/")) url = "/" + url
        return url
      }

    }, task.linkedInURL)

    if(response) {
      status.notify("event/inmsg-response", response.msg)
      return
    }
  }
  status.done()
}
