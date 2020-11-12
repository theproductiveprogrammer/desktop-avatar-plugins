'use strict'

plugin.info = {
  name: "Linkedin View",
  sayOnStart: task => pickOne(startChats(task)),
  sayOnEnd: task => pickOne(doneChats(task)),
}

if(plugin.task) {
  performTask(plugin.task)
    .then(() => {
      status.done()
    })
    .catch(err => {
      status.fail(err)
    })
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
  await page.waitFor('input[role=combobox]')
  await autoScroll(page)
  await autoScroll(page)
  status.done()
}
