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
  await page.goto('https://www.linkedin.com/messaging/')
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
      for(let i = 0;i < msgList.length;i++) {
        if(compareURLResourcePath(msgList[i].querySelector('a[data-control-name=view_profile]').href, url)) {
          return {
            responded: true,
            msg: msgList[i].getElementsByClassName('msg-s-event-listitem__body')[0].innerText
          }
        }
      }

      function compareURLResourcePath(url1, url2){
        if (!url1 || !url2) return false

        if(isAbsoulteURL(url1))
          url1 = new URL(url1).pathname

        if(isAbsoulteURL(url2))
          url2 = new URL(url2).pathname

        if(!url1.endsWith('/')) url1 += '/'
        if(!url2.endsWith('/')) url2 += '/'
        if(!url1.startsWith('/')) url1 = '/' + url1

        if(!url2.startsWith('/')) url2 = '/' + url2

        return url1 == url2;
      }

      function isAbsoulteURL(url) {
        try{
          new URL(url)
          return true
        }catch(e) {
          return false;
        }
      }

      /*    outcome/
       * Compare the two URL paths by ignoring the difference
       * between http:// and https:// and by removing any trailing
       * slashes
       */
      function urleq(u1, u2) {
        return norm_1(u1) == norm_1(u2)

        function norm_1(u) {
          u = u.replace(/^http:/, 'https:')
          u = u.replace(/\/$/, '')
          return u
        }
      }

    }, task.linkedInURL)

    if(response) {
      status.notify("event/inmsg-response", response.msg)
      return
    }
  }
  status.done()
}
