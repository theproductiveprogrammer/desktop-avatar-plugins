'use strict'

plugin.info = {
  name: "Linkedin Check Connect",
  chat,
  sayOnStart: task => pickOne(startChats(task)),
  sayOnEnd: task => pickOne(doneChats(task)),
}

function chat(task, status) {
  if(status.code == 102) return pickOne(startChats(task))
  if(status.code == 200) {
    if(status.notify === "event/connection-accept") {
      return pickOne(connectedChats(task))
    } else {
      return pickOne(doneChats(task))
    }
  }
}

function startChats(task) {
  const user = getUser(task)
  return [
    `Checking the status of connection request to profile for ${user}`,
    `${user} is connected or not? Lets Check`,
    `Checking if ${user} is has connected to us yet...`,
  ]
}

function doneChats(task) {
  const user = getUser(task)
  return [
    `Finished checking status of connection request`,
    `Done checking - ${user} has not accepted our connection request yet`,
    `Completed checking connection status of ${user}`,
    `Completed checking connection status of ${user} - no reponse yet`,
  ]
}

function connectedChats(task) {
  const user = getUser(task)
  return [
    `Bravo! ${user} accepted the connection request`,
    `Connection request was accepted by ${user}!`,
    `Our Connection request was accepted by ${user}!`,
    `${user} has accepted our request to connect!`,
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
  await page.waitForSelector('.distance-badge.separator')

  const connected = await page.evaluate(async () => {
    let d = document.getElementsByClassName("distance-badge separator")[0]
    let txt = d.innerText
    return txt.indexOf("1st degree connection") != -1
  })

  if(connected) {
    status.notify("event/connection-accept")
  } else {
    status.done()
  }
}
