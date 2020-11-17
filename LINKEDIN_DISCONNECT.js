'use strict'

plugin.info = {
  name: "Linkedin Disconnect",
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
    `Going to withdraw connection request for ${user}`,
    `Beginning the removal of connection request to the ${user}`,
  ]
}

function doneChats(task) {
  const user = getUser(task)
  return [
    `Connect request withdrawn for ${user}`,
    `We are done with ${user}. Connection request withdrawn  `
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
    
        await page.goto("https://www.linkedin.com/mynetwork/invitation-manager/sent/")
        await page.waitForSelector('.mn-invitation-list')
        await autoScroll(page)
        let clicked = await page.evaluate(async (url) => {
          let invites = document.getElementsByClassName("mn-invitation-list")[0]
          invites = invites.getElementsByTagName('li')
          for(let i = 0;i < invites.length;i++) {
            let invite = invites[i]
            let urls = invite.getElementsByTagName('a')
            for(let i = 0;i < urls.length;i++) {
              if(url == urls[i]) {
                let btn = invite.getElementsByTagName('button')[0]
                btn.click()
                return true
              }
            }
          }
        }, task.linkedInURL)
        if(clicked) {
          await page.click('.artdeco-modal__confirm-dialog-btn.artdeco-button.artdeco-button--2.artdeco-button--primary.ember-view')
          await page.waitFor("p.artdeco-toast-item__message")
          status.notify('event/connection-withdrawn')
        }
        else {
          status.done()
        }
  
  }
  