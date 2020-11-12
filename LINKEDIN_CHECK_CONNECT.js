'use strict'

plugin.info = {
  name: "Linkedin Check Connect",
  sayOnStart: task => pickOne(startChats(task)),
  sayOnEnd: task => pickOne(doneChats(task)),
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
