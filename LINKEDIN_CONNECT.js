'use strict'

plugin.info = {
  name: "Linkedin Connect",
  sayOnStart: task => pickOne(startChats(task)),
  sayOnEnd: task => pickOne(doneChats(task)),
}

function startChats(task) {
  const user = getUser(task)
  return [
    `Going to send the connection request to profile for ${user}`,
    `Sending the connection request to profile for ${user}`,
  ]
}
const MAX_PENDING_CONNECTIONS=1000

function doneChats(task) {
  const user = getUser(task)
  return [
    `Finished sending the connection request to the profile ${user}`,
    `Done ${user} a connection request sent! Should be connected soon...`
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
    await page.waitForSelector('.distance-badge.separator')

    const connected = await page.evaluate(async () => {
      let d = document.getElementsByClassName("distance-badge separator")[0]
      let txt = d.innerText
      return txt.indexOf("1st degree connection") != -1
    })
    if(connected) {
      status.done()
      return
    }
  } catch(e) {
    /* ignore - we are not connected */
  }

  try {
    await page.goto("https://www.linkedin.com/mynetwork/invitation-manager/sent/")
    await page.waitForSelector('.mn-invitation-list')

    await autoScroll(page)
    const url = task.linkedInURL
    const already = await page.evaluate(async ({ url, MAX_PENDING_CONNECTIONS }) => {
      /**
       *  outcome/
       * This function removes the domain name from absolute_url and compare with relate_url.
       * if path's are matching return true else false
       *
       * @param {*} url1
       * @param {*} url2
       */
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
      const invites = document.getElementsByClassName("mn-invitation-list")[0]
      const urls = invites.getElementsByTagName('a')
      for(let i = 0;i < urls.length;i++) {
        const isConnectPending = compareURLResourcePath(url, urls[i].href)
        if(isConnectPending) {
          return 'inprogress'
        }
      }

      const filterbar = document.getElementsByClassName('mn-filters-toolbar')[0]
      const nums = filterbar.innerText
      const m = nums.match(/People \((.*?)\)/)
      if(m) {
        const num = parseInt(m[1])
        if(!isNaN(num)) {
          if(num > MAX_PENDING_CONNECTIONS) return 'toomany'
        }
      }

    }, { url, MAX_PENDING_CONNECTIONS })
    if(already === "inprogress") {
      status.done()
      return
    }
    if(already) {
      status.usererr(already)
      return
    }
  } catch(e) {
    if(e.name != 'TimeoutError') throw e
    /* if no pending invitations - we can continue */
  }

  await page.goto(task.linkedInURL)
  let currentUrl = page.url()
  if(currentUrl.includes('unavailable')) throw new Error(`${url}: this profile is not available`)
  await waitForConnectionOption(page)

  await page.click('.pv-s-profile-actions--connect')
  try {
    await page.waitForSelector(
      '[aria-label="Send now"]',
      { visible: true })
  } catch(e) {
    /* try another interface */
    await page.waitForSelector(
      '[aria-label="Send invitation"]',
      { visible: true })
  }

  if(task.note) {
    await waitForNoteOption(page,task.note)
    await waitforemailoption(page,task.email)
    await clickButton([
      'Done',
      'Send now',
      'Send invitation',
    ], page)
    status.done()
  } else {
    await waitforemailoption(page,task.email)
    await clickButton([
      'Done',
      'Send now',
      'Send invitation',
    ], page)
    status.done()
  }
}


// Handles different types of buttons occuring at the time of giving connection request.
function clickButton(names, page) {
  let promises = names.map(n => page.click(`button[aria-label="${n}"]`))
  return new Promise((resolve, reject) => {
    Promise.allSettled(promises).then(v => {
      for(let i = 0;i < v.length;i++) {
        if(v[i].status === 'fulfilled') return resolve()
      }
      return reject(v[0].reason)
    })
      .catch(reject)
  })
}

// For Handling Email prompts while sending connection request
async function waitforemailoption(page,email){
  try{
    const emailid = "input#email"
    await page.waitForSelector(emailid,{visible:true})
    if(email){
      await page.type(emailid,email)
    }
  }catch(e){
    return
  }
}

// For Handling Note prompts while sending connection request
async function waitForNoteOption(page,note){
  try{
    await page.waitForSelector('button[aria-label="Add a note"]', {visible: true})
    await page.click('button[aria-label="Add a note"]')
    await page.$('#custom-message')
      .then((connectionNote) => connectionNote.type(note))
  }catch(e){
    await page.$('#custom-message')
      .then((connectionNote) => connectionNote.type(note))
  }
}

//Waiting for Connection Button
async function waitForConnectionOption(page) {
  try{
    await page.waitForSelector(
      '.pv-s-profile-actions--connect',
      { visible: true })
  } catch(e) {
    await page.click('.pv-s-profile-actions__overflow-toggle')
  }
}
