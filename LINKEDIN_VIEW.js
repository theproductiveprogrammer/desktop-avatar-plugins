'use strict'

plugin.info = {
  name: "Linkedin View",
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
    `Going to view the linkedin profile for ${user}`,
    `Opening linked in profile of ${user}`,
  ]
}

function doneChats(task) {
  const user = getUser(task)
  return [
    `Done looking at the profile for ${user}`,
    `Gave ${user} a new view! Hopefully that should help us connect...`
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
  await autoScroll(page)
  await autoScroll(page)
  status.done()
}
